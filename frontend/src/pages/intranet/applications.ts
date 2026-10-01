import {
  LayoutDashboard,
  Vote,
  DollarSign,
  Users,
  Monitor,
  Clock,
  Truck,
  Scan,
  HardDrive,
  Mail,
  Settings,
  FileText,
  ClipboardList,
  Briefcase,
  HeartHandshake,
  QrCode,
  Pickaxe,
  ClipboardCheck,
  Files
} from 'lucide-react';

export interface AppItem {
  id: string;
  title: string;
  icon: any;
  description: string;
  status: 'active' | 'inactive';
  url?: string;
  image?: string;
  iconImage?: string;
}

export const SECURE_APPS: AppItem[] = [
  {
    id: 'app1',
    title: 'Support IT',
    icon: Monitor,
    description: 'Ticketing et assistance technique pour le support informatique',
    status: 'active',
    image: '/images/interfaces/optimized/app1.webp',
    iconImage: '/images/interfaces/support-it-icon.svg',
    url: 'http://10.16.220.85/index.php'
  },
  
  {
    id: 'app3',
    title: 'Fiche de paie',
    icon: DollarSign,
    description: 'Consultation et téléchargement des bulletins de salaire',
    status: 'active',
    image: '/images/interfaces/optimized/app3.webp',
    iconImage: '/images/interfaces/fiche-paie-icon.svg',
    url: 'http://10.16.220.199:13000/login'
  },
  {
    id: 'app20',
    title: 'SIGAM',
    icon: Pickaxe,
    description: '',
    status: 'active',
    image: '/images/interfaces/optimized/app20.webp',
    url: 'https://sigam.anam.dz/'
  },
  {
    id: 'app30',
    title: 'SIG',
    icon: Files,
    description: '',
    status: 'active',
    image: '/images/interfaces/optimized/app30.webp',
    url: 'https://sig.anam.dz/portal/'
  },
  {
    id: 'app25',
    title: 'Catalogage & Classification des Données',
    icon: Files,
    description: 'Application de catalogage et de classification des données',
    status: 'active',
    image: '/images/interfaces/optimized/app25.webp',
    url: 'http://10.16.220.121:3000/'
  },
  {
  id: 'app26',
  title: 'Evaluation',
  icon: ClipboardCheck,
  description: 'Application de gestion et de suivi des évaluations',
  status: 'active',
  image: '/images/interfaces/optimized/app26.webp',
  url: 'http://evaluation.anam.dz:3002/login'
},
{
    id: 'app4',
    title: 'Réception',
    icon: Users,
    description: 'Gestion des visiteurs et système d’accueil numérique',
    status: 'active',
    image: '/images/interfaces/optimized/app4.webp',
    url: 'http://10.16.220.204:8080/login'
  },
   {
    id: 'app27',
    title: 'Pointage ANAM',
    icon: QrCode,
    description: '',
    status: 'active',
    image: '/images/interfaces/optimized/app27.webp',
    url: 'http://10.16.220.140:4180/'
  },
  {
    id: 'app5',
    title: 'Application IDARA',
    icon: LayoutDashboard,
    description: 'Gestion administrative centralisée pour les opérations quotidiennes',
    status: 'active',
    image: '/images/interfaces/optimized/app5.webp',
    url: 'https://idara.anam.dz/'
  },
  {
    id: 'app6',
    title: 'Gestion de pointage',
    icon: Clock,
    description: 'Suivi des heures de travail et gestion des présences',
    status: 'active',
    image: '/images/interfaces/optimized/app6.webp',
    url: 'http://pointage/login/'
  },
  {
    id: 'app7',
    title: 'Gestion de parc',
    icon: Truck,
    description: 'Gestion de la flotte de véhicules et de la logistique',
    status: 'active',
    image: '/images/interfaces/optimized/app7.webp',
    url: 'http://intranet.corp.anam.dz:10000/'
  },
  {
    id: 'app9',
    title: 'GED',
    icon: HardDrive,
    description: 'Gestion électronique des documents et archivage numérique',
    status: 'active',
    image: '/images/interfaces/optimized/app9.webp',
    url: 'https://iam.anam.dz/'
  },
  
{
    id: 'app12',
    title: 'BARID(Ministère)',
    icon: Mail,
    description: 'Gestion numérique du courrier entrant et sortant (Ministère)',
    status: 'active',
    image: '/images/interfaces/optimized/app12.webp',
    url: 'https://barid.mines.gov.dz/dist/index.html#/login'

  },
  {
    id: 'app11',
    title: 'BARID(ANAM)',
    icon: Mail,
    description: 'Gestion numérique du courrier entrant et sortant (ANAM)',
    status: 'active',
    image: '/images/interfaces/optimized/app11.webp',
    url: 'https://barid.anam.dz/dist/index.html#/login'
  },
  {
    id: 'app21',
    title: 'QRForm',
    icon: QrCode,
    description: '',
    image: '/images/interfaces/optimized/app21.webp',
    status: 'active',
    url: 'http://41.111.149.189:9090/'
  },
  
  {
    id: 'app15',
    title: 'Admin Console',
    icon: Settings,
    description: 'Administration des accès utilisateurs et des rôles',
    status: 'active',
    url: 'https://intranet.anam.dz/admin/login'
  }

];
