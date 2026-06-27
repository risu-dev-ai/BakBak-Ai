const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const contactController = require('../controllers/contactController');

router.use(protect);

router.route('/').get(contactController.getContacts).post(contactController.addContact);
router.post('/sync', contactController.syncContacts);
router.route('/check/:userId').get(contactController.checkContact);
router.route('/:contactId').delete(contactController.removeContact);
router.route('/:contactId/favorite').put(contactController.toggleFavorite);
router.route('/:contactId/block').put(contactController.toggleBlock);

module.exports = router;
