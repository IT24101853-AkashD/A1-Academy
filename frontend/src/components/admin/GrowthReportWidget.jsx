import React, { useState, useEffect } from 'react';

export default function GrowthReportWidget() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, []);

    const fetchReport = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(${import.meta.env.VITE_API_URL}/api/users/growth-report?startDate=&endDate=, {
                headers: { Authorization: \Bearer \\ }
            });
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            } else {
                setError('Failed to fetch report');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };
