module.exports = {
  SupabaseConnection: {
    testConnection: jest.fn().mockResolvedValue({ connected: true }),
  },
};
