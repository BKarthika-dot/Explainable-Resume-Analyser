from pathlib import Path
import numpy as np
import plotly.graph_objects as go
from sklearn.decomposition import PCA

# 🎯 THE FIX: this module used to fig.write_html() straight into the process's
# working directory, and generate_retrieval_map() never returned anything
# (implicit None) — so `vector_map_url` in the API response was always null,
# and even the HTML file itself was never reachable over HTTP; it just sat on
# disk. Writing into a dedicated static_maps/ folder that main.py mounts as a
# static route, and returning the URL path to that file, is what actually lets
# the frontend embed it.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static_maps"
STATIC_DIR.mkdir(parents=True, exist_ok=True)


def generate_retrieval_map(target_track: str, retrieved_nodes: list, active_query_text: str = None, active_query_embedding: list = None):
    """
    Plots every chunk inside a specific track's vector index, maps the active user query,
    and draws proximity trajectories to demonstrate the mathematical retrieval alignment.

    Returns the URL path (e.g. "/static/vector_space_aiml.html") the frontend can load in
    an iframe, or None if the map couldn't be generated.
    """
    print(f"\n[XAI Visualizer]: Initializing low-level text mapping for track [{target_track.upper()}]...")

    # 🎯 THE FIX: this used to call build_isolated_engines() again from scratch,
    # re-scanning the data directory and re-running the reindex check for every
    # track a second time within the SAME request (retriever.py already built and
    # cached these engines once at import time). Doing it twice roughly doubles
    # this endpoint's latency for no real benefit, and made "Cache Miss" log
    # lines appear to repeat suspiciously within a single request. We now just
    # reuse the engine cache retriever.py already built at import time.
    from modules.retriever import get_engines
    engines = get_engines()

    if target_track not in engines:
        print(f"Error: Track '{target_track}' not found in active engines.")
        return None

    query_engine = engines[target_track]
    index = query_engine.retriever._index
    vector_store = index.vector_store
    
    store_data = getattr(vector_store, "_data", None)
    if store_data is not None and hasattr(store_data, "embedding_dict"):
        embedding_dict = store_data.embedding_dict
    else:
        embedding_dict = getattr(vector_store, "embedding_dict", {})

    retrieved_texts = [node.node.get_content().strip() for node in retrieved_nodes]

    all_embeddings = []
    chunk_metadata = []
    marker_colors = []
    marker_sizes = []
    node_types = []  # Keep track of structural types for legend mapping

    # 1. Harvest and process database index embeddings
    for node_id, embedding in embedding_dict.items():
        if embedding is not None:
            all_embeddings.append(embedding)
            
            raw_text = "Context Guideline Text Entry"
            file_origin = "Guidelines/JD Document"
            
            try:
                if node_id in index.index_struct.nodes_dict:
                    node_obj = index.docstore.get_node(node_id)
                    raw_text = node_obj.get_content()
                    file_origin = node_obj.metadata.get('file_name', 'System Document')
            except Exception:
                pass

            clean_snippet = raw_text.strip().replace("\n", "<br>")
            if len(clean_snippet) > 250:
                clean_snippet = clean_snippet[:250] + "..."

            hover_details = f"<b>File:</b> {file_origin}<br><b>Text Chunk:</b> {clean_snippet}"

            if raw_text.strip() in retrieved_texts:
                node_types.append("active")
                marker_colors.append("#FF3333")  # Neon Red
                marker_sizes.append(14)
                chunk_metadata.append(f"🎯 <b>ACTIVE EVALUATION SOURCE</b><br>{hover_details}")
            else:
                node_types.append("background")
                marker_colors.append("#A0A0A0")  # Slate Grey
                marker_sizes.append(8)
                chunk_metadata.append(f"<b>Background Context</b><br>{hover_details}")

    n_samples = len(all_embeddings)
    print(f"[XAI Visualizer]: Identified {n_samples} node embeddings in the index.")
    
    if n_samples == 0:
        print("❌ Error: No valid embedding vectors found in memory array.")
        return None

    # Convert document collection to a numpy matrix
    matrix = np.array(all_embeddings)

    # ════════════════════════════════════════════════════════════
    # INTEGRATE ACTIVE USER QUERY INTO COORDINATE SPACE
    # ════════════════════════════════════════════════════════════
    has_query_vector = active_query_embedding is not None and active_query_text is not None
    if has_query_vector:
        q_vec = np.array(active_query_embedding).reshape(1, -1)
        # Stack the query vector to fit the PCA coordinates concurrently
        matrix_combined = np.vstack([matrix, q_vec])
    else:
        matrix_combined = matrix

    # Execute dimensional reduction math (Capturing maximum variance)
    components_to_fit = 2 if len(matrix_combined) >= 2 else 1
    pca = PCA(n_components=components_to_fit)
    reduced_coords = pca.fit_transform(matrix_combined)
    
    # Separate vectors back to their specific identity pools
    if has_query_vector:
        coords_docs = reduced_coords[:-1]
        coord_query = reduced_coords[-1]
    else:
        coords_docs = reduced_coords
        coord_query = None

    # Handle low-density matrix arrays safely
    x_docs = coords_docs[:, 0]
    y_docs = coords_docs[:, 1] if components_to_fit == 2 else np.zeros_like(x_docs)

    # 2. Build the graph layer by layer using Graph Objects
    fig = go.Figure()

    # Layer A: Plot the Unselected Context Nodes
    bg_mask = np.array([nt == "background" for nt in node_types])
    if np.any(bg_mask):
        fig.add_trace(go.Scatter(
            x=x_docs[bg_mask], y=y_docs[bg_mask],
            mode='markers',
            marker=dict(size=8, color='#A0A0A0', opacity=0.6),
            text=np.array(chunk_metadata)[bg_mask],
            hovertemplate="%{text}<extra></extra>",
            name='Unselected Context Nodes'
        ))

    # Layer B: Plot the Active Retrieved Evidence Chunks
    active_mask = np.array([nt == "active" for nt in node_types])
    if np.any(active_mask):
        fig.add_trace(go.Scatter(
            x=x_docs[active_mask], y=y_docs[active_mask],
            mode='markers',
            marker=dict(size=14, color='#FF3333', line=dict(width=1.5, color='white')),
            text=np.array(chunk_metadata)[active_mask],
            hovertemplate="%{text}<extra></extra>",
            name='RETRIEVED EVIDENCE (Active)'
        ))

    # Layer C: Plot Query Vector Anchor & Proximity Trajectories
    if has_query_vector:
        x_q = coord_query[0]
        y_q = coord_query[1] if components_to_fit == 2 else 0

        # Draw the physical trajectory vectors connecting query to evidence
        for idx in range(len(x_docs)):
            if node_types[idx] == "active":
                fig.add_trace(go.Scatter(
                    x=[x_q, x_docs[idx]],
                    y=[y_q, y_docs[idx]],
                    mode='lines',
                    line=dict(color='#FFA500', width=1.5, dash='dot'),
                    hoverinfo='skip',
                    showlegend=False
                ))

        # Superimpose the actual user query coordinate node
        fig.add_trace(go.Scatter(
            x=[x_q], y=[y_q],
            mode='markers',
            marker=dict(size=18, color='#FFD700', symbol='star', line=dict(width=1, color='white')),
            text=[f"⚡ <b>ACTIVE USER QUERY</b><br>'{active_query_text}'"],
            hovertemplate="%{text}<extra></extra>",
            name='User Query Anchor'
        ))

    # ════════════════════════════════════════════════════════════
    # EXPOSE THE MATHEMATICAL SYSTEM STATS VIA DASHBOARD LAYOUT
    # ════════════════════════════════════════════════════════════
    explained_variance = np.sum(pca.explained_variance_ratio_) * 100
    
    fig.update_layout(
        title=dict(
            text=f"<b>XAI Audit: Low-Level Vector Space Topography ({target_track.upper()} Track)</b><br>"
                 f"<i>Mathematical Context: High-dimensional embeddings compressed via PCA, preserving "
                 f"{explained_variance:.1f}% total structural variance.</i>",
            font=dict(size=13, color='#E0E0E0')
        ),
        xaxis_title="Principal Component 1 (Direction of Max Variance)",
        yaxis_title="Principal Component 2 (Orthogonal Variance Vector)",
        template="plotly_dark",
        legend_title_text="Node State Allocation",
        hoverlabel=dict(
            bgcolor="#1A1A1A", 
            font_size=11, 
            font_family="Consolas, Courier New",
            align="left"
        )
    )

    output_filename = f"vector_space_{target_track}.html"
    output_path = STATIC_DIR / output_filename
    fig.write_html(str(output_path))
    print(f"🔬 Mathematical mapping complete! Served at /static/{output_filename}")

    return f"/static/{output_filename}"
