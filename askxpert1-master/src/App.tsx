/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Mail, Phone, User, Check, ArrowRight, 
  Globe, Building2, 
  BookOpen, Award, CheckCircle, Smartphone 
} from 'lucide-react';

export default function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  
  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [registrationCard, setRegistrationCard] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    if (!name.trim() || !email.trim() || !mobile.trim()) {
      setSubmitError('Please complete all requested registration credentials.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim()
    };

    try {
      // Direct registration call to our server backend
      const response = await fetch(`${import.meta.env.BASE_URL}api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        setSubmitError(resData.error || 'Failed to submit registration. Please check your network and try again.');
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setRegistrationCard(resData.data);
      // Clear forms
      setName('');
      setEmail('');
      setMobile('');
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitError('Failed to save registration. Please check your network and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal selection:bg-brand-green selection:text-white relative overflow-x-hidden p-4 sm:p-6 md:p-8 flex flex-col justify-between">
      {/* Halftone backdrop mimicking the program poster print texture */}
      <div className="absolute inset-0 bg-halftone pointer-events-none z-0 opacity-60" />

      {/* --- MAIN PAGE CONSTRUCT --- */}
      <main className="w-full max-w-7xl mx-auto my-auto py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center relative z-10">
        
        {/* LEFT COLUMN: BRAND AND ANNOUNCEMENT (Grid 7 cols) */}
        <section className="lg:col-span-7 flex flex-col justify-center space-y-8 text-left relative">
          
          {/* Campaign Tag */}
          <div className="flex items-center space-x-2">
            <span className="bg-brand-green/10 border border-brand-green/20 text-brand-green px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
              Career Series 2026
            </span>
          </div>

          {/* Heading Blocks */}
          <div className="relative space-y-2">

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-[#1C1D1A] leading-none flex flex-wrap items-baseline">
              <span className="font-serif italic font-normal text-brand-green pr-1">Ask</span>
              <span className="font-sans font-bold">Xpert</span>
            </h1>
            
            {/* Themed Motto */}
            <h2 className="text-xs sm:text-sm font-mono font-bold tracking-widest text-brand-muted uppercase max-w-xl leading-relaxed">
              &ldquo;A CONVERSATION TODAY, A CAREER INSIGHT TOMORROW&rdquo;
            </h2>
          </div>
          
          {/* Staggered COMING SOON stack from the poster */}
          <div className="space-y-1 py-4 select-none relative max-w-max">
            {/* Top outline row */}
            <div 
              className="text-4xl sm:text-6xl font-black font-sans uppercase tracking-tight opacity-30 h-[42px] sm:h-[62px] leading-none"
              style={{ WebkitTextStroke: '1px #055C20', color: 'transparent' }}
            >
              COMING SOON
            </div>
            
            {/* Main Solid Green */}
            <div className="text-4xl sm:text-6xl font-black font-sans uppercase tracking-tight text-brand-green h-[42px] sm:h-[62px] leading-none drop-shadow-sm flex items-center space-x-2">
              <span>COMING SOON</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-accent animate-ping" />
            </div>

            {/* Bottom outline row */}
            <div 
              className="text-4xl sm:text-6xl font-black font-sans uppercase tracking-tight opacity-20 h-[42px] sm:h-[62px] leading-none"
              style={{ WebkitTextStroke: '1px #055C20', color: 'transparent' }}
            >
              COMING SOON
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: REGISTRATION AND ARTWORK (Grid 5 cols) */}
        <section className="lg:col-span-5 w-full flex flex-col items-center">
          
          <AnimatePresence mode="wait">
            {!submitSuccess ? (
              /* THE FORM CARD */
              <motion.div 
                key="form-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-white border border-brand-cream-dark p-6 sm:p-8 rounded-2xl shadow-sm relative overflow-hidden"
              >
                {/* Visual mic representation directly in card backdrop or floating */}
                <div className="absolute right-0 bottom-0 opacity-[0.03] pointer-events-none z-0 transform translate-x-12 translate-y-12">
                  <svg className="w-56 h-56 text-brand-green" fill="currentColor" viewBox="0 0 100 100">
                    <rect x="40" y="10" width="20" height="40" rx="10" />
                    <path d="M30,40 C30,55 70,55 70,40" stroke="currentColor" strokeWidth="6" fill="none" />
                    <line x1="50" y1="55" x2="50" y2="80" stroke="currentColor" strokeWidth="8" />
                    <rect x="35" y="80" width="30" height="10" rx="3" />
                  </svg>
                </div>

                <div className="space-y-1.5 mb-6">
                  <h3 className="text-xl font-bold font-serif text-brand-green flex items-center space-x-2">
                    <span>Drop Your Coordinates</span>
                  </h3>
                  <p className="text-xs text-brand-muted font-mono uppercase tracking-wide">Enter info to receive direct broadcast updates</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider font-mono">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4.5 w-4.5 text-brand-muted/70" />
                      <input
                        id="notify-name"
                        type="text"
                        placeholder="NAME"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-brand-cream-dark bg-brand-cream bg-opacity-20 py-2.5 pl-10 pr-4 text-sm focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Twin input row: Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider font-mono">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-brand-muted/70" />
                        <input
                          id="notify-email"
                          type="email"
                          placeholder="EMAIL"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-brand-cream-dark bg-brand-cream bg-opacity-20 py-2.5 pl-10 pr-4 text-sm focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider font-mono">WhatsApp/Mobile</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-3 h-4.5 w-4.5 text-brand-muted/70" />
                        <input
                          id="notify-mobile"
                          type="tel"
                          placeholder="NUMBER"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full rounded-xl border border-brand-cream-dark bg-brand-cream bg-opacity-20 py-2.5 pl-10 pr-4 text-sm focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Error display */}
                  {submitError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 leading-snug">
                      {submitError}
                    </div>
                  )}

                  {/* Register Trigger button */}
                  <button
                    id="notify-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-brand-green py-4 font-mono text-xs font-bold tracking-widest text-white shadow-sm hover:bg-brand-accent hover:shadow active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'BROADCASTING SUBMISSION...' : 'NOTIFY ME ON ARRIVAL'}</span>
                    <ArrowRight className="h-4 w-4 animate-pulse" />
                  </button>

                </form>
              </motion.div>
            ) : (
              /* SUCCESS / REGISTRATION TICKET */
              <motion.div 
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-white border-2 border-brand-green p-8 rounded-2xl shadow-md text-center relative overflow-hidden"
              >
                {/* Visual success seal decoration */}
                <div className="absolute top-0 right-0 h-24 w-24 bg-brand-green/5 rounded-full transform translate-x-8 -translate-y-8" />
                
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/10 text-brand-green mx-auto mb-4">
                  <CheckCircle className="h-10 w-10" />
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="text-2xl font-serif font-black text-brand-green leading-tight">You're On The List!</h3>
                  <p className="text-sm text-brand-muted font-sans font-medium px-4">
                    Thank you, <span className="text-[#1C1D1A] font-bold">{registrationCard?.name}</span>. Your ticket for career updates has been locked.
                  </p>
                </div>

                {/* Simulated Program Pass */}
                <div className="border border-brand-green/30 bg-brand-cream/30 rounded-xl p-4 mb-6 relative">
                  {/* Ticket punches left/right */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-brand-cream border-r border-brand-green/30" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-brand-cream border-l border-brand-green/30" />
                  
                  <div className="text-left space-y-3 font-mono">
                    <div className="flex justify-between items-center text-[10px] text-brand-muted font-bold border-b border-brand-green/20 pb-2">
                      <span>ASKXPERT NOTIFY BROADCAST</span>
                      <span className="text-xs text-brand-green font-bold font-mono">CEK SB</span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-[9px] uppercase text-brand-muted block">ID NO</span>
                        <span className="font-bold text-[#1C1D1A] overflow-hidden text-ellipsis block whitespace-nowrap">{registrationCard?.id?.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-brand-muted block">EMAIL</span>
                        <span className="font-bold text-[#1C1D1A] overflow-hidden text-ellipsis block whitespace-nowrap">{registrationCard?.email}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-brand-muted block">WHATSAPP/MOBILE</span>
                        <span className="font-bold text-[#1C1D1A] overflow-hidden text-ellipsis block whitespace-nowrap">{registrationCard?.mobile}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-brand-muted block">LOCKED DATE</span>
                        <span className="font-bold text-[#1C1D1A] block whitespace-nowrap">{new Date(registrationCard?.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    id="success-btn-dismiss"
                    onClick={() => {
                      setSubmitSuccess(false);
                      setRegistrationCard(null);
                    }}
                    className="w-full py-3 bg-brand-green text-white rounded-xl font-mono text-xs font-bold tracking-widest hover:bg-brand-accent transition-all cursor-pointer"
                  >
                    REGISTER ANOTHER STUDENT
                  </button>
                  <p className="text-[10px] text-brand-muted font-mono">
                    A confirmation log has been appended to the Student Branch ledger.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>



        </section>

      </main>


      {/* --- FOOTER REGISTRY AND SECRET SOCIAL ACCESS --- */}
      <footer className="w-full max-w-7xl mx-auto border-t border-brand-green/10 pt-6 mt-8 flex flex-col md:flex-row items-center justify-between pointer-events-auto z-10 text-xs text-brand-muted font-mono relative">
        <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-1 sm:space-y-0 text-center md:text-left">
          <a 
            id="brand-website"
            href="https://ieee.ce-kgr.org" 
            target="_blank" 
            rel="noreferrer" 
            className="hover:text-brand-green transition-colors font-bold flex items-center space-x-1"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>ieee.ce-kgr.org</span>
          </a>
          <span className="hidden sm:inline text-brand-green/30">|</span>
          <p>© 2026 IEEE SB CE KIDANGOOR.ALL INTELLECTUAL RESERVES PROTECTED.</p>
        </div>
      </footer>
    </div>
  );
}
