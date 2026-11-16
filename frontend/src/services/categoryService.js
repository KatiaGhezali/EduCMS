import api from "./api";

export const getCategories = async (params = {}) => {
  const response = await api.get("/categories", { params });

  return {
    categories: response.data.data || [],
    pagination: response.data.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  };
};

export const createCategory = async (categoryData) => {
  const response = await api.post("/categories", categoryData);

  return response.data;
};

export const updateCategory = async (categoryId, categoryData) => {
  const response = await api.patch(`/categories/${categoryId}`, categoryData);

  return response.data;
};

export const deleteCategory = async (categoryId) => {
  const response = await api.delete(`/categories/${categoryId}`);

  return response.data;
};
