import API from "./API";

// ✅ Fetch active pairing
export const getActivePairing = async () => {
  const res = await API.get("/sessions/pairing/");
  return res.data;
};
