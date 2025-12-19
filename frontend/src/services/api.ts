import { http } from "./http";

export const authAPI = {
  register: (body: { email: string; phone: string; password: string; name: string; role?: string }) =>
    http.post("/auth/register", body),
  login: (body: { email: string; password: string; twoFactorCode?: string }) => http.post("/auth/login", body),
  me: () => http.get("/auth/me"),
  refresh: (body: { refreshToken: string }) => http.post("/auth/refresh", body),
  logout: () => http.post("/auth/logout"),
};

export const walletAPI = {
  getBalance: () => http.get("/wallet/balance"),
  getTransactions: (params: { page?: number; limit?: number; type?: string; status?: string }) =>
    http.get("/wallet/transactions", { params }),
  depositMpesa: (body: { amount: number; phone: string }) => http.post("/wallet/deposit/mpesa", body),
  depositCard: (body: { amount: number }) => http.post("/wallet/deposit/card", body),
  checkCardPaymentStatus: (providerTransactionId: string) => http.get(`/wallet/card/status/${providerTransactionId}`),
  withdrawMpesa: (body: { amount: number; phone: string }) => http.post("/wallet/withdraw/mpesa", body),
  transfer: (body: { recipientPhone: string; amount: number; note?: string }) => http.post("/wallet/transfer", body),
  checkPaymentStatus: (checkoutRequestID: string) => http.get(`/wallet/mpesa/status/${checkoutRequestID}`),
  createReceipt: (transactionId: string) => http.post(`/wallet/transactions/${transactionId}/receipt`),
};

export const merchantAPI = {
  me: () => http.get("/merchant/me"),
  generateQRCode: () => http.post("/merchant/qr"),
  processQRPayment: (body: { merchantId: string; amount: number; note?: string }) => http.post("/merchant/qr/pay", body),
  getMerchantPublic: (merchantId: string) => http.get(`/merchant/${merchantId}/public`),
  payByCard: (body: { merchantId: string; amount: number; note?: string }) => http.post("/merchant/card/pay", body),
  checkCardPaymentStatus: (providerTransactionId: string) => http.get(`/merchant/card/status/${providerTransactionId}`),
  getSalesStats: (params: { period?: "today" | "7days" | "30days" } = {}) => http.get("/merchant/sales", { params }),
};

export const projectAPI = {
  createProject: (body: {
    title: string;
    description: string;
    category?: string;
    budget: number;
    deadline?: string;
    milestones: { title: string; description: string; amount: number; dueDate?: string }[];
  }) => http.post("/projects", body),
  getProjects: (params: { page?: number; limit?: number; status?: string; category?: string; search?: string; role?: string } = {}) =>
    http.get("/projects", { params }),
  getProjectById: (id: string) => http.get(`/projects/${id}`),
  publishProject: (id: string) => http.post(`/projects/${id}/publish`),
  applyToProject: (id: string, body: { coverLetter?: string; proposedRate?: number; estimatedDuration?: string }) =>
    http.post(`/projects/${id}/apply`, body),
  assignImplementer: (id: string, implementerId: string) => http.post(`/projects/${id}/assign`, { implementerId }),
  fundProject: (id: string) => http.post(`/projects/${id}/fund`),
  approveMilestone: (projectId: string, milestoneId: string, notes?: string) =>
    http.post(`/projects/${projectId}/milestones/${milestoneId}/approve`, { notes }),
  rejectMilestone: (projectId: string, milestoneId: string, reason?: string) =>
    http.post(`/projects/${projectId}/milestones/${milestoneId}/reject`, { reason }),
};

export const notificationAPI = {
  list: (params: { page?: number; limit?: number; unread?: boolean } = {}) =>
    http.get("/notifications", { params: { ...params, unread: params.unread ? "true" : undefined } }),
  markRead: (id: string) => http.post(`/notifications/${id}/read`),
  markAllRead: () => http.post("/notifications/read-all"),
};

export const kycAPI = {
  me: () => http.get("/kyc/me"),
  submit: (body: { idType?: string; idNumber?: string; dateOfBirth?: string; address?: string; files?: File[] }) => {
    const fd = new FormData();
    if (body.idType) fd.append("idType", body.idType);
    if (body.idNumber) fd.append("idNumber", body.idNumber);
    if (body.dateOfBirth) fd.append("dateOfBirth", body.dateOfBirth);
    if (body.address) fd.append("address", body.address);
    (body.files || []).forEach((f) => fd.append("files", f));
    return http.post("/kyc/submit", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

export const accountAPI = {
  updateMe: (body: { name?: string; email?: string; phone?: string }) => http.put("/account/me", body),
  sessions: () => http.get("/account/sessions"),
};

export const adminAPI = {
  stats: () => http.get("/admin/stats"),
  users: (params: { page?: number; limit?: number; q?: string; role?: string; status?: string; kycStatus?: string } = {}) =>
    http.get("/admin/users", { params }),
  updateUserStatus: (id: string, status: string) => http.patch(`/admin/users/${id}/status`, { status }),
  transactions: (params: { page?: number; limit?: number; q?: string; type?: string; status?: string } = {}) =>
    http.get("/admin/transactions", { params }),
  wallets: (params: { page?: number; limit?: number; q?: string } = {}) => http.get("/admin/wallets", { params }),
  kyc: (params: { page?: number; limit?: number; status?: string } = {}) => http.get("/admin/kyc", { params }),
  reviewKyc: (userId: string, action: "APPROVE" | "REJECT", notes?: string) =>
    http.post(`/admin/kyc/${userId}/review`, { action, notes }),
  disputes: (params: { page?: number; limit?: number; status?: string; priority?: string } = {}) =>
    http.get("/admin/disputes", { params }),
};


