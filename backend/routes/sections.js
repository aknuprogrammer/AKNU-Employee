const express = require('express');
const router = express.Router();
const { getSections, createSection, updateSection } = require('../controllers/sectionController');
const { protect } = require('../middleware/auth'); 

router.route('/')
  .get(protect, getSections)
  .post(protect, createSection);

router.route('/:id')
  .put(protect, updateSection);

module.exports = router;
