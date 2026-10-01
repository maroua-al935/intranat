import React from 'react';
import { ArrowLeft, ArrowLeftRight, Building2, Map, Pickaxe } from 'lucide-react';
import { Link } from 'react-router-dom';
import './InterfacesPage.css';

const interfaces = [
  {
    code: 'GUNAM',
    title: 'Guichet Unique National des Activités Minières',
    description: 'Centralisez vos démarches et demandes minières en ligne.',
    icon: Building2,
    number: '01',
  },
  {
    code: 'POM',
    title: 'Portail des Opérateurs Miniers',
    description: 'Gérez efficacement vos permis miniers.',
    icon: Pickaxe,
    number: '02',
  },
  {
    code: 'CADASTRE MINIER NATIONAL',
    title: 'Cadastre Minier National',
    description: 'Consultez les données cadastrales minières nationales.',
    icon: Map,
    number: '03',
  },
  {
    code: 'SIGAM ↔ GUNAM',
    title: 'Dashboard de Synchronisation SIGAM–GUNAM',
    description: 'Supervisez les échanges entre plateformes.',
    icon: ArrowLeftRight,
    number: '04',
  },
];

const InterfacesPage: React.FC = () => (
  <main className="interfaces-page">
    <Link className="interfaces-back-button" to="/">
      <ArrowLeft size={17} aria-hidden="true" />
      <span>Retour à l’accueil</span>
    </Link>
    <header className="interfaces-heading">
      <div className="interfaces-eyebrow"><span /> ÉCOSYSTÈME NUMÉRIQUE MINIER</div>
      <h1>Nos plateformes</h1>
      <p>Des outils numériques dédiés aux démarches et aux activités minières nationales.</p>
    </header>

    <section className="interfaces-grid" aria-label="Plateformes minières">
      {interfaces.map(({ code, title, description, icon: Icon, number }, index) => (
        <article
          className="interface-card"
          key={code}
          style={{ '--card-delay': `${index * 100}ms` } as React.CSSProperties}
        >
          <div className="interface-card-content">
            <div className="interface-card-topline">
              <span className="interface-card-icon"><Icon size={21} strokeWidth={1.8} /></span>
              <span className="interface-card-number">{number}</span>
            </div>
            <div className="interface-card-copy">
              <span className="interface-card-code">{code}</span>
              <h2>{title}</h2>
              <span className="interface-card-status">En cours de développement · Lancement prochain</span>
              <p>{description}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
    <footer className="interfaces-footer">Agence Nationale des Activités Minières <span>•</span> ANAM</footer>
  </main>
);

export default InterfacesPage;
