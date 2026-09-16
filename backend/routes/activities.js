const express = require('express');
const router = express.Router();
const { getActivities, createActivity, approveActivity, updateActivity } = require('../controllers/activityController');

const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getActivities)
  .post(protect, createActivity);

router.route('/:id')
  .put(protect, updateActivity);

router.put('/:id/approve', protect, approveActivity);

module.exports = router;
