import api from "./api";

export const getTags = async (params = {}) => {
  const response = await api.get("/tags", { params });

  return {
    tags: response.data.data || [],
    pagination: response.data.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  };
};

export const createTag = async (tagData) => {
  const response = await api.post("/tags", tagData);
  return response.data;
};

export const updateTag = async (tagId, tagData) => {
  const response = await api.patch(`/tags/${tagId}`, tagData);
  return response.data;
};

export const deleteTag = async (tagId) => {
  const response = await api.delete(`/tags/${tagId}`);
  return response.data;
};
