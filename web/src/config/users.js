// User Configuration
// IMPORTANT: These user IDs must exist in your database (UserMaster table)
// Update these IDs to match actual users in your database

export const AVAILABLE_USERS = [
  { id: 1, name: 'User 1' },
  { id: 2, name: 'User 2' },
  { id: 3, name: 'User 3' },
  { id: 4, name: 'User 4' },
  { id: 5, name: 'User 5' }
];

// Instructions:
// 1. Check your database UserMaster table for existing user IDs
// 2. Update the IDs above to match real user IDs from your database
// 3. Update the names to match the actual user names if desired
//
// Example SQL to get users:
// SELECT user_id, name FROM user_master WHERE status = 'ACTIVE' LIMIT 5;
//
// Then update this file like:
// export const AVAILABLE_USERS = [
//   { id: 101, name: 'John Doe' },
//   { id: 102, name: 'Jane Smith' },
//   ...
// ];
