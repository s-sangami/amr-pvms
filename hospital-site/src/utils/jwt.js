export function decodeToken() {
  const token = sessionStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      username: payload.sub,
      role: payload.role,
      facilityName: payload.facilityName,
      facilityId: payload.facilityId,
      specialization: payload.specialization,
      staffId: payload.staffId,
    };
  } catch {
    return null;
  }
}