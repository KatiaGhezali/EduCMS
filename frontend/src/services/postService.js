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

export const getPostById = async (postId) => {
  const response = await api.get(`/posts/${postId}`);
  return response.data.data;
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

// Get all revisions for a specific post
export const getPostRevisions = async (postId) => {
  const response = await api.get(`/posts/${postId}/revisions`);

  return response.data.data || [];
};

// Get the details of a specific revision
export const getPostRevision = async (postId, revisionId) => {
  const response = await api.get(`/posts/${postId}/revisions/${revisionId}`);

  return response.data.data;
};

// Restore a post to a selected revision
export const restorePostRevision = async (postId, revisionId) => {
  const response = await api.post(
    `/posts/${postId}/revisions/${revisionId}/restore`,
  );

  return response.data;
};
