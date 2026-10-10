import React, { useState, useEffect } from 'react';

export default function GrowthReportWidget() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
