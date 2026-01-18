export async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'waterbar_unsigned');

  const res = await fetch(
    'https://api.cloudinary.com/v1_1/dkrgdowbp/image/upload',
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  const data = await res.json();
  return data.secure_url;   // 这就是最终图片 URL
}