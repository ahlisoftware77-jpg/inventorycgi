export interface FileShare {
  id: string;
  name: string;
  path: string;
  description: string;
  allowedUsers: string[];
  status: 'active' | 'inactive';
  allowUpload?: boolean;
  allowDelete?: boolean;
  deleteAllowedUsers?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface FileShareLog {
  id: string;
  shareId: string;
  shareName: string;
  userId: string;
  userName: string;
  accessedAt: number;
}
