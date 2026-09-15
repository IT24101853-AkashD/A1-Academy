const fs = require('fs');
const path = require('path');

const profilePath = path.join(__dirname, 'src', 'pages', 'ProfilePage.jsx');
let content = fs.readFileSync(profilePath, 'utf8');

// 1. Add state for validation error
content = content.replace(
    /const \[saveError, setSaveError\] = useState\(''\);/,
    "const [saveError, setSaveError] = useState('');\n    const [firstNameError, setFirstNameError] = useState('');"
);

// 2. Validate in saveProfile
const saveProfileStart = /const saveProfile = async \(e\) => \{\s*e\.preventDefault\(\);\s*setIsSaving\(true\);\s*setSaveError\(''\);/;
const saveProfileReplacement = `const saveProfile = async (e) => {\n        e.preventDefault();\n        if (!formValues.firstName || formValues.firstName.trim() === '') {\n            setFirstNameError('First name is required.');\n            return;\n        }\n        setIsSaving(true);\n        setSaveError('');\n        setFirstNameError('');`;
content = content.replace(saveProfileStart, saveProfileReplacement);

// 3. Clear error on change
const updateFieldStart = /const updateField = \(field\) => \(e\) => \{\s*setFormValues\(\(prev\) => \(\{ \.\.\.prev, \[field\]: e\.target\.value \}\)\);\s*\};/;
const updateFieldReplacement = `const updateField = (field) => (e) => {\n        if (field === 'firstName') setFirstNameError('');\n        setFormValues((prev) => ({ ...prev, [field]: e.target.value }));\n    };`;
content = content.replace(updateFieldStart, updateFieldReplacement);

// 4. Update the JSX for First Name
const firstNameInputRegex = /<input\s*id="profile-first-name"\s*type="text"\s*value=\{formValues\.firstName\}\s*onChange=\{updateField\('firstName'\)\}\s*required\s*className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"\s*\/>/;
const firstNameInputReplacement = `<input
                                    id="profile-first-name"
                                    type="text"
                                    value={formValues.firstName}
                                    onChange={updateField('firstName')}
                                    className={\`w-full px-4 py-3 rounded-xl border text-slate-900 font-medium focus:outline-none focus:ring-2 \${firstNameError ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:ring-slate-900'}\`}
                                />
                                {firstNameError && <p className="mt-1.5 text-sm font-bold text-red-500">{firstNameError}</p>}`;
content = content.replace(firstNameInputRegex, firstNameInputReplacement);

fs.writeFileSync(profilePath, content, 'utf8');
console.log('Fixed ProfilePage First Name validation.');
