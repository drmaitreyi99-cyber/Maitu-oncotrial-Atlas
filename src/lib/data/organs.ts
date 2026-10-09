import type { OrganSystem } from "@/lib/types";

export const organs: OrganSystem[] = [
  { id: "breast", name: "Breast Cancer", group: "Solid tumors", summary: "HR-positive, HER2-positive, and triple-negative disease across early and metastatic settings.", subtypes: ["HR-positive HER2-negative", "HER2-positive", "Triple-negative"] },
  { id: "lung", name: "Lung Cancer: NSCLC and SCLC", group: "Solid tumors", summary: "Non-small-cell and small-cell lung cancer, including oncogene-driven and immunotherapy settings.", subtypes: ["NSCLC", "SCLC"] },
  { id: "esophageal", name: "Esophageal Cancer", group: "Gastrointestinal", summary: "Squamous and adenocarcinoma of the esophagus.", subtypes: ["Squamous cell carcinoma", "Adenocarcinoma"] },
  { id: "gastric", name: "Gastric and GEJ Cancer", group: "Gastrointestinal", summary: "Gastric and gastro-esophageal junction adenocarcinoma.", subtypes: ["Gastric", "GEJ"] },
  { id: "colorectal", name: "Colorectal Cancer", group: "Gastrointestinal", summary: "Colon and rectal cancer, including biomarker-selected therapy.", subtypes: ["Colon", "Rectum"] },
  { id: "pancreatic", name: "Pancreatic Cancer", group: "Gastrointestinal", summary: "Exocrine pancreatic adenocarcinoma.", subtypes: ["Adenocarcinoma"] },
  { id: "biliary", name: "Biliary Tract Cancer", group: "Gastrointestinal", summary: "Cholangiocarcinoma and gallbladder cancer.", subtypes: ["Intrahepatic", "Extrahepatic", "Gallbladder"] },
  { id: "hcc", name: "Hepatocellular Cancer", group: "Gastrointestinal", summary: "Hepatocellular carcinoma.", subtypes: ["HCC"] },
  { id: "ovarian", name: "Ovarian Cancer", group: "Gynecologic", summary: "Epithelial ovarian, fallopian tube, and primary peritoneal cancer.", subtypes: ["High-grade serous", "Endometrioid"] },
  { id: "endometrial", name: "Endometrial Cancer", group: "Gynecologic", summary: "Endometrial carcinoma, including mismatch-repair subsets.", subtypes: ["dMMR", "pMMR"] },
  { id: "cervical", name: "Cervical Cancer", group: "Gynecologic", summary: "Locally advanced and persistent, recurrent, or metastatic cervical cancer.", subtypes: ["Squamous", "Adenocarcinoma"] },
  { id: "rcc", name: "Renal Cell Carcinoma", group: "Genitourinary", summary: "Renal cell carcinoma.", subtypes: ["Clear cell", "Non-clear cell"] },
  { id: "prostate", name: "Prostate Cancer", group: "Genitourinary", summary: "Hormone-sensitive and castration-resistant prostate cancer.", subtypes: ["mHSPC", "mCRPC"] },
  { id: "urothelial", name: "Urothelial Cancer", group: "Genitourinary", summary: "Urothelial carcinoma of the bladder and upper tract.", subtypes: ["Bladder", "Upper tract"] },
  { id: "testicular", name: "Testicular Cancer", group: "Genitourinary", summary: "Germ-cell tumors.", subtypes: ["Seminoma", "Non-seminoma"] },
  { id: "head-neck", name: "Head and Neck Cancer", group: "Head and neck", summary: "Squamous cell carcinoma of the head and neck.", subtypes: ["HPV-positive", "HPV-negative"] },
  { id: "thyroid", name: "Thyroid Cancer", group: "Head and neck", summary: "Differentiated, medullary, and anaplastic thyroid cancer.", subtypes: ["Differentiated", "Medullary", "Anaplastic"] },
  { id: "melanoma", name: "Melanoma", group: "Skin and sarcoma", summary: "Cutaneous and mucosal melanoma.", subtypes: ["Cutaneous", "Mucosal"] },
  { id: "sarcoma", name: "Sarcoma", group: "Skin and sarcoma", summary: "Soft-tissue and bone sarcoma.", subtypes: ["Soft tissue", "Bone"] },
  { id: "cns", name: "Glioma and CNS Tumors", group: "CNS", summary: "Glioma and other primary central nervous system tumors.", subtypes: ["Glioblastoma", "Lower-grade glioma"] },
  { id: "net", name: "Neuroendocrine Tumors", group: "Neuroendocrine", summary: "Gastroenteropancreatic and lung neuroendocrine neoplasms.", subtypes: ["GEP-NET", "Lung NET"] },
  { id: "myeloma", name: "Multiple Myeloma", group: "Hematologic", summary: "Plasma-cell myeloma.", subtypes: ["Newly diagnosed", "Relapsed"] },
  { id: "hodgkin", name: "Hodgkin Lymphoma", group: "Hematologic", summary: "Classical Hodgkin lymphoma.", subtypes: ["Early", "Advanced"] },
  { id: "nhl", name: "Non-Hodgkin Lymphoma", group: "Hematologic", summary: "B-cell and T-cell lymphomas.", subtypes: ["DLBCL", "Follicular", "Mantle cell"] },
  { id: "aml", name: "AML", group: "Hematologic", summary: "Acute myeloid leukemia.", subtypes: ["Fit", "Unfit"] },
  { id: "all", name: "ALL", group: "Hematologic", summary: "Acute lymphoblastic leukemia.", subtypes: ["B-ALL", "T-ALL"] },
  { id: "cml", name: "CML", group: "Hematologic", summary: "Chronic myeloid leukemia.", subtypes: ["Chronic phase"] },
  { id: "cll", name: "CLL", group: "Hematologic", summary: "Chronic lymphocytic leukemia.", subtypes: ["Treatment-naive", "Relapsed"] },
  { id: "mds-mpn", name: "MDS and MPN", group: "Hematologic", summary: "Myelodysplastic syndromes and myeloproliferative neoplasms.", subtypes: ["MDS", "MPN"] },
  { id: "rare", name: "Other rare malignancies", group: "Rare", summary: "Rare solid tumors not listed above.", subtypes: ["Rare"] },
];

export function organById(id: string) {
  return organs.find((organ) => organ.id === id);
}
