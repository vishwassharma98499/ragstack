const DEMO_DOCUMENTS = [
  { id: "1", name: "Kubernetes Best Practices.pdf", pages: 24, chunks: 48, uploaded: "2025-12-01" },
  { id: "2", name: "AWS Well-Architected Framework.pdf", pages: 36, chunks: 72, uploaded: "2025-12-05" },
  { id: "3", name: "Terraform Module Design.pdf", pages: 18, chunks: 34, uploaded: "2025-12-10" }
];

const DEMO_RESPONSES = [
  {
    trigger: "kubernetes",
    answer: "Based on your documents, Kubernetes best practices include: using resource limits on all containers, implementing pod disruption budgets for high availability, using namespaces for isolation, and enabling RBAC for access control. The document recommends starting with managed services like EKS or GKE before considering self-managed clusters.",
    sources: [{ doc: "Kubernetes Best Practices.pdf", page: 5, chunk: "Section 2.1: Resource Management" }]
  },
  {
    trigger: "terraform",
    answer: "According to your Terraform Module Design document, modules should follow a standard structure with variables.tf, main.tf, and outputs.tf. Key principles include: using variable validation blocks, tagging all resources consistently, storing state in S3 with DynamoDB locking, and keeping modules small and composable rather than monolithic.",
    sources: [{ doc: "Terraform Module Design.pdf", page: 8, chunk: "Section 3: Module Structure" }]
  },
  {
    trigger: "default",
    answer: "Based on the uploaded documents, I can help you with questions about Kubernetes operations, AWS architecture patterns, and Terraform infrastructure design. Could you ask something more specific about one of these topics?",
    sources: []
  }
];

export function isDemoMode() {
  return !process.env.REACT_APP_API_URL || process.env.REACT_APP_DEMO === "true";
}

export function getDemoDocuments() {
  return DEMO_DOCUMENTS;
}

export async function* streamDemoResponse(message) {
  const lower = message.toLowerCase();
  const match = DEMO_RESPONSES.find(r => lower.includes(r.trigger)) || DEMO_RESPONSES.find(r => r.trigger === "default");
  const words = match.answer.split(" ");
  for (const word of words) {
    yield word + " ";
    await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
  }
}

export function getDemoSources(message) {
  const lower = message.toLowerCase();
  const match = DEMO_RESPONSES.find(r => lower.includes(r.trigger)) || DEMO_RESPONSES.find(r => r.trigger === "default");
  return match.sources;
}