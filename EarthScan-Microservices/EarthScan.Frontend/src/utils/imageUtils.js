/**
 * Validates and compresses image files in the browser before upload.
 */

/**
 * Validates if the file is an image and within size limits.
 * @param {File} file 
 * @param {number} maxSizeMB 
 * @returns {string|null} Error message, or null if valid.
 */
export const validateImageFile = (file, maxSizeMB = 5) => {
    if (!file) return "No file selected.";
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        return "Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed.";
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
        return `File size exceeds the limit of ${maxSizeMB} MB. Please upload a smaller image.`;
    }

    return null;
};

/**
 * Compresses an image file using HTML5 canvas.
 * @param {File} file 
 * @param {number} maxWidth 
 * @param {number} maxHeight 
 * @param {number} quality 
 * @returns {Promise<File>} Compressed File object
 */
export const compressImage = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        // If file is already small (e.g., < 300KB), return as is
        if (file.size < 300 * 1024) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale image conserving aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert canvas to Blob
                const mimeType = file.type === 'image/png' ? 'image/jpeg' : file.type; // Convert PNG to JPEG for better compression if needed
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        // Return the compressed file if it's smaller, otherwise original
                        resolve(compressedFile.size < file.size ? compressedFile : file);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
