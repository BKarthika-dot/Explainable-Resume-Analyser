import { useRef, useState } from "react";
import { Upload, FileText, Sparkles, X, CheckCircle2, ArrowRight, ShieldCheck, Briefcase } from "lucide-react";

const SAMPLE_RESUMES = [
  {
    name: "test.txt",
    role: "AI Engineer",
    label: "AI Engineer Sample",
    badge: "AI/ML Track",
    content: `B Karthika 
City: Chennai, Tamil Nadu 
Phone Number: 8056101167 
Email: bkarthika1203@gmail.com 
Github: BKarthika-dot 
Linkedin: (39) Karthika Balasubramanian | LinkedIn 
EDUCATION 
Bachelor of Technology (B.Tech) in Computer Science (Core) 
2024-2028 (Expected) 
CGPA: 8.99/10 
TECHNICAL SKILLS 
Languages: Python, C, Java 
Machine Learning: Supervised Learning, CNNs, Random Forest, XGBoost, Keras, TensorFlow 
Explainability: SHAP, LIME, Causal Learning, Fairness Analysis 
Tools: VS Code, Git, Jupyter Notebook 
Databases: MongoDB 
PROJECTS 
Voice-Based Interview Preparation Assistant  
● Built a voice-driven interview simulation app using the Deepgram API with real-time 
transcription, dynamic response generation, Flutter and Render for deployment, and 
MongoDB-based transcript and performance storage.  
Interpretable and Causally Validated Recruitment System 
● Developed a supervised ML model to predict candidate hiring probability; performed 
global and local interpretability using SHAP and implemented a counterfactual fairness 
probe to evaluate demographic sensitivity and ethical robustness. 
Explainable Heart Stroke Risk Prediction (Comparative Study) 
● SHAP-driven interpretability analysis for RF vs. XGBoost models for imbalanced 
classification. 
Multiclass Image Classification using CNNs 
● Built and optimized CNN architectures for multiclass image classification, improving 
validation performance and generalization. 
INTERESTS 
Explainable AI • Machine Learning • Human-AI Systems`
  },
  {
    name: "test_resume_SAP_fresher_rohan_desai.txt",
    role: "SAP Consultant",
    label: "SAP Developer Sample",
    badge: "SAP Track",
    content: `RESUME - TEST CANDIDATE (SAP DEVELOPER)
NAME: Rohan Desai
EMAIL: rohan.desai.sap@gmail.com
PHONE: +91-9876501234
LOCATION: Nashik, Maharashtra, India

PROFESSIONAL SUMMARY
B.Tech Computer Science graduate with SAP ABAP training at NIIT. Built hands-on SAP projects covering MM module processes. Completed internship at SAP consulting firm. Looking for SAP ABAP Developer role.

SAP SKILLS
ABAP: Classical reports, ALV reports (REUSE_ALV_GRID_DISPLAY), SELECT statements, internal tables, work areas, function modules.
Transactions: SE38, SE80, SE11, SE16N, ST22, ME21N, MIGO.
Data Dictionary: Transparent tables, data elements, domains, Z-table.
SAP Module: MM (Materials Management) - P2P cycle, vendor master, material master.

EDUCATION
B.Tech in Computer Science and Engineering, 2024, CGPA: 8.1/10

SAP PROJECTS
1. Open Purchase Order Tracking Report (ALV) - ABAP ALV report selecting open POs from EKKO and EKPO tables using INNER JOIN.
2. Vendor Master Data Display Report - Classical ABAP report displaying vendor master data from LFA1 and LFB1.`
  },
  {
    name: "MARCUS CHEN.txt",
    role: "Data Analyst",
    label: "Data Analyst Sample",
    badge: "Data Analyst Track",
    content: `MARCUS CHEN

Email: marcus.chen.analyst@gmail.com | Phone: 555-0178 | GitHub: github.com/mchen-data

SUMMARY

Data Analyst with 3+ years of experience translating complex datasets into actionable business strategies. Proven track record of optimizing database performance and building automated BI pipelines that directly reduced operational costs by 15%. Specialist in SQL, Python, and Tableau.

TECHNICAL SKILLS

Databases & SQL: PostgreSQL, Snowflake, BigQuery, Query Optimization, ETL/ELT

Languages: Python (Pandas, NumPy, Scikit-Learn), R

Visualization & BI: Tableau, Power BI, Looker, Dashboard Design

Analytical Methods: Cohort Analysis, A/B Testing, Regression Modeling, SQL Window Functions

EXPERIENCE

Data Analyst | FinTech Innovations

September 2024 – Present

Optimized SQL queries and redesigned indexes in Snowflake, reducing dashboard load times by 40% and saving 12 hours of weekly processing time.

Built a predictive customer churn dashboard in Tableau using Python-processed data, enabling the retention team to identify and save 8% of at-risk accounts.

Led the analysis of a major product feature A/B test with a sample size of over 100,000 users, resulting in a 4.2% lift in user conversion.

Designed automated ETL pipelines using Python, eliminating manual Excel reporting for the finance team and reducing data entry errors to zero.

Junior Data Analyst | Apex Retail Group

June 2023 – August 2024

Developed interactive sales dashboards in Power BI used by 15+ regional managers to track daily KPIs and inventory levels.

Identified a 5% leak in supply chain efficiency by conducting a deep-dive cohort analysis on shipping delays, saving $45,000 annually.

Wrote and documented 50+ reusable SQL scripts to standardize monthly reporting across the business intelligence unit.

EDUCATION

B.S. in Statistics & Machine Learning

University of Washington | Graduated 2023`
  }
];

export default function IntakeForm({ onSubmit, disabled }) {
  const [role, setRole] = useState("");
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("student");
  const [isDragging, setIsDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  const roleValid = role.trim().length > 1;
  const fileValid = !!file && file.name.endsWith(".txt");

  function acceptFile(candidate) {
    if (!candidate) return;
    setFile(candidate);
  }

  function handleDrop(e) {
  e.preventDefault();
  setIsDragging(false);
  const dropped = e.dataTransfer.files?.[0];
  if (dropped) acceptFile(dropped);
}

  // Set default mode based on the sample role if matching
  function loadSample(sample) {
    setRole(sample.role);
    const blob = new Blob([sample.content], { type: "text/plain" });
    const sampleFile = new File([blob], sample.name, { type: "text/plain" });
    setFile(sampleFile);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!roleValid || !fileValid || disabled) return;
    onSubmit({ role: role.trim(), file, mode });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Quick Sample Presets */}
      <div>
        <span className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-brass mb-2">
          Benchmark Presets
        </span>
        <div className="grid grid-cols-1 gap-2">
          {SAMPLE_RESUMES.map((s) => (
            <button
              key={s.name}
              type="button"
              disabled={disabled}
              onClick={() => loadSample(s)}
              className="flex items-center justify-between p-3 rounded-sm border border-ink-700 bg-ink-950/70 hover:border-brass/60 hover:bg-ink-900 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-brass group-hover:scale-110 transition-transform" />
                <div>
                  <span className="font-mono text-[0.78rem] font-semibold text-ink_text group-hover:text-brass transition-colors block">
                    {s.label}
                  </span>
                  <span className="text-[0.68rem] text-muted font-mono">
                    Target Role: {s.role}
                  </span>
                </div>
              </div>
              <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded bg-ink-800 border border-ink-600 text-teal-light">
                {s.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Target Role Input */}
      <div>
        <label htmlFor="role" className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-2">
          Target Role Designation
        </label>
        <input
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. AI Engineer, SAP Consultant, Data Analyst"
          disabled={disabled}
          className="w-full bg-ink-950 border border-ink-700 rounded-sm px-3.5 py-2.5 text-[0.88rem] text-ink_text placeholder:text-muted/50 focus:border-brass focus:ring-1 focus:ring-brass transition-colors disabled:opacity-50 font-body"
        />
        {touched && !roleValid && (
          <p className="mt-1.5 text-[0.73rem] text-rust-light font-mono">Designation required for screening.</p>
        )}
      </div>

      {/* Resume File Upload Dropzone */}
      <div>
        <label className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-2">
          Candidate Resume (.txt Format)
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative rounded-sm border px-4 py-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-brass bg-brass/10 shadow-lg shadow-brass/5"
              : file
              ? "border-teal/60 bg-teal/5"
              : "border-ink-700 hover:border-brass/40 bg-ink-950/60"
          } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          {file ? (
            <div className="flex items-center justify-between gap-3 p-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-brass shrink-0" />
                <div className="text-left truncate">
                  <p className="font-mono text-[0.82rem] font-medium text-ink_text truncate">{file.name}</p>
                  <p className="text-[0.7rem] text-muted font-mono">
                    {(file.size / 1024).toFixed(1)} KB &middot; Plain Text
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="text-muted hover:text-rust-light p-1 rounded hover:bg-ink-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-5 h-5 text-brass opacity-80" />
              <p className="text-[0.84rem] font-medium text-ink_text">
                Drop candidate .txt file here, or <span className="text-brass underline">browse</span>
              </p>
              <p className="text-[0.7rem] text-muted font-mono">
                Demographic metadata will be automatically isolated
              </p>
            </div>
          )}
        </div>
        {touched && !fileValid && (
          <p className="mt-1.5 text-[0.73rem] text-rust-light font-mono">Select candidate .txt file.</p>
        )}
      </div>

      {/* Operation Mode Selector */}
      <div className="border-t border-ink-700/50 pt-4">
        <span className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-2">
          Operation Mode
        </span>
        <div className="grid grid-cols-2 gap-2 bg-ink-950 p-1 rounded-sm border border-ink-700">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("student")}
            className={`py-2 text-center text-xs font-semibold font-mono rounded-sm transition-all ${
              mode === "student"
                ? "bg-brass text-ink-950 shadow"
                : "text-muted hover:text-ink_text"
            }`}
          >
            Student Mode
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("recruiter")}
            className={`py-2 text-center text-xs font-semibold font-mono rounded-sm transition-all ${
              mode === "recruiter"
                ? "bg-brass text-ink-950 shadow"
                : "text-muted hover:text-ink_text"
            }`}
          >
            Recruiter Mode
          </button>
        </div>
        <p className="mt-2 text-[0.68rem] text-muted font-mono leading-normal">
          {mode === "student"
            ? "Student mode runs dense RAG to score portfolios and outline detailed improvement roadmaps."
            : "Recruiter mode runs hybrid RAG, bandit UCB routing policy, and enables candidate Q&A."}
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled}
        className="mt-1 group relative flex items-center justify-center gap-2 overflow-hidden rounded-sm bg-brass text-ink-950 font-body font-semibold text-[0.88rem] px-5 py-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:enabled:bg-brass-light hover:enabled:shadow-lg hover:enabled:shadow-brass/10"
      >
        <span>{disabled ? "Executing Explainable Pipeline..." : "Execute Screening Analysis"}</span>
        {!disabled && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
      </button>
    </form>
  );
}
