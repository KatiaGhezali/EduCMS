import api from "./api";

export const getPosts = async (params = {}) => {
  const response = await api.get("/posts", { params });

  return {
    posts: response.data.data || [],
    pagination: response.data.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  };
};

export const createPost = async (postData) => {
  const response = await api.post("/posts", postData);

  return response.data;
};

export const updatePost = async (postId, postData) => {
  const response = await api.patch(`/posts/${postId}`, postData);

  return response.data;
};

export const deletePost = async (postId) => {
  const response = await api.delete(`/posts/${postId}`);

  return response.data;
};
