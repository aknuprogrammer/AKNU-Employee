const express = require('express');
const router = express.Router();
const { getActivities, createActivity, approveActivity, updateActivity } = require('../controllers/activityController');

const mockProtect = (req, res, next) => {
    req.user = { id: '60d0fe4f5311236168a109ca', role: 'admin' };
    next();
};

router.route('/')
  .get(mockProtect, getActivities)
  .post(mockProtect, createActivity);

router.route('/:id')
  .put(mockProtect, updateActivity);

router.put('/:id/approve', mockProtect, approveActivity);

module.exports = router;
