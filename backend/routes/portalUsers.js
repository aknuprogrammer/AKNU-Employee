const express = require('express');
const router = express.Router();
const { getPortalUsers, createPortalUser, updatePortalUser, deletePortalUser, bulkImportPortalUsers } = require('../controllers/portalUsersController');
const { protect } = require('../middleware/auth');

router.post('/bulk', protect, bulkImportPortalUsers);

router.route('/')
  .get(protect, getPortalUsers)
  .post(protect, createPortalUser);

router.route('/:id')
  .put(protect, updatePortalUser)
  .delete(protect, deletePortalUser);

module.exports = router;
