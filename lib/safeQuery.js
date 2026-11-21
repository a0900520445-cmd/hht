// 查詢失敗(或尚未設定 Supabase)時回傳預設值，網站不會整頁壞掉
module.exports = async function safeQuery(build, fallback = []) {
  try {
    const { data, error } = await build();
    if (error) throw error;
    return data ?? fallback;
  } catch (e) {
    console.error('[safeQuery]', e.message);
    return fallback;
  }
};
