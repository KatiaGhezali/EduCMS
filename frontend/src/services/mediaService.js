import api from "./api";

export const getMedia = async (params = {}) => {
  const response = await api.get("/media", { params });

  return {
    media: response.data.data || [],
    pagination: response.data.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  };
};

export const uploadMedia = async (formData) => {
  const response = await api.post("/media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data;
};

export const updateMedia = async (id, data) => {
  const response = await api.patch(`/media/${id}`, data);

  return response.data.data;
};

export const deleteMedia = async (id) => {
  const response = await api.delete(`/media/${id}`);

  return response.data;
};
