export interface Slide {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  link?: string;
  buttonText?: string;
  createdAt?: string;
}
export interface Article {
  _id: string;          
  id?: string;         
  title: string;
  content?: string;
  category: string;
  description?: string;
  imageUrl?: string;
  pdfUrl?: string;
  pdfProtected?: boolean;
  date: string;
  views: number;
  status: 'draft' | 'published';
  cardId?: string | Card;
  createdAt?: string;
  isNew?: boolean; 
  notificationSent?: boolean; 
}

export interface Card {
  _id: string;
  id?: string;          
  title: string;
  description?: string;
  imageUrl?: string;
  category: string;
  color?: string;
  redirectUrl?: string;
  order: number;
  isActive: boolean;
  requiresLdapLogin?: boolean;
  accessUsernames?: string[];
  disableNotifications?: boolean;
  createdAt: string;
  articles?: Article[];
}

export interface User {
  username: string;
  role: 'admin' | 'user';
  token?: string;
}

export enum Category {
  EVENTS = 'Événements',
  MEDIA = 'Médias',
  DOCUMENTS = 'Documents',
  NEWS = 'Actualités',
  INTERNAL = 'Interne'
}

export interface AdminComponentProps {
  onError?: (error: string) => void;
}
