/**
 * Cloudinary API integration using our Backend Express server
 */

const API_URL = 'http://localhost:5000/api';

export const uploadToCloudinary = async (file: File | Blob, filename: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('file', file, filename);

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error("Backend server or Cloudinary error");
    
    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};
