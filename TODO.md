# TODO List for Modifying `iniciarProcessoSeguindo` Function

## Tasks
- [ ] Update IndexedDB schema to version 2, adding stores for 'closeFriends', 'hiddenStory', 'muted'
- [ ] Modify `dbHelper.openDB()` to create new stores in `onupgradeneeded`
- [ ] Reorder operations in `carregarSeguindo()`: Load caches first, then following
- [ ] Add logic to load caches from DB into `userListCache` if available, else fetch and save
- [ ] Update status modal steps to reflect new order: Close Friends, Hide Story, Muted, Following
- [ ] Ensure caches are saved as arrays of usernames to DB after extraction
- [ ] Test the function to verify caches are persisted and loaded correctly

## Progress
- [x] Plan confirmed by user
- [x] Implementation started
