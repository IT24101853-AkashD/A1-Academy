import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/IndexPage';
import AboutPage from './pages/AboutPage';
import CareersPage from './pages/CareersPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AuthModals from './components/AuthModals';

function App() {
  const [activeModal, setActiveModal] = useState(null);
  const openModal = (id) => setActiveModal(id);
  const closeModal = () => setActiveModal(null);
  window.openReactModal = openModal;

  return (
    <BrowserRouter>
      <AuthModals activeModal={activeModal} setActiveModal={setActiveModal} openModal={openModal} closeModal={closeModal} />
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/index.html" element={<IndexPage />} />
        <Route path="/about.html" element={<AboutPage />} />
        <Route path="/careers.html" element={<CareersPage />} />
        <Route path="/contact.html" element={<ContactPage />} />
        <Route path="/help.html" element={<HelpPage />} />
        <Route path="/privacy.html" element={<PrivacyPage />} />
        <Route path="/terms.html" element={<TermsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
