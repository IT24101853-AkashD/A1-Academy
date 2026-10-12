/**
 * Triggers a client-side file download for a Blob object.
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerFileDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}
