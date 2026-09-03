import React from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

export default function CareersPage() {
  return (
    <Layout>
      <section className="flex-grow flex flex-col items-center justify-center min-h-[70vh] px-6 py-24" data-aos="zoom-in">
        <div className="max-w-3xl w-full text-center flex flex-col items-center gap-8">
            <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-6xl text-slate-400">
                    sentiment_dissatisfied
                </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
                We're growing, but our team is currently full!
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed">
                While we do not have any open positions right now, A1 Academy is constantly expanding. We are always looking for passionate educators and technical innovators. Please check back soon—your next big opportunity might be just around the corner.
            </p>
            <Link to="/" className="mt-8 inline-flex justify-center items-center px-8 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl">
                Return to Homepage
            </Link>
        </div>
      </section>
    </Layout>
  );
}