import React, { useState, useEffect } from 'react';

export default function AwardBadgeModal({ isOpen, onClose, student, classId }) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            void fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teacher/badges/templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
                if (data.length > 0) {
                    setSelectedTemplateId(data[0].id);
                }
            } else {
                setError('Failed to load templates');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teacher/badges/award`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: student.id,
                    masterBadgeTemplateId: Number.parseInt(selectedTemplateId, 10),
                    comments
                })
            });

            if (res.ok) {
                onClose();
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to award badge');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Award Badge</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    Awarding to: <span className="font-semibold">{student?.firstName} {student?.lastName}</span>
                </p>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="badgeSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Badge</label>
                        <select
                            id="badgeSelect"
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            required
                        >
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="badgeComments" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comments (Optional)</label>
                        <textarea
                            id="badgeComments"
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            rows={3}
                            placeholder="Great job!"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50">
                            {isSubmitting ? 'Awarding...' : 'Award Badge'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
