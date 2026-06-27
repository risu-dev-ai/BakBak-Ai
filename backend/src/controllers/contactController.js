const Contact = require('../models/Contact');
const User = require('../models/User');

// @desc    Add a new contact
// @route   POST /api/v1/contacts
// @access  Private
exports.addContact = async (req, res) => {
  try {
    const { userId, nickname, addedVia } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Prevent adding yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a contact',
      });
    }

    // Check if the target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if contact already exists
    const existingContact = await Contact.findOne({
      owner: req.user._id,
      contact: userId,
    });

    if (existingContact) {
      return res.status(409).json({
        success: false,
        message: 'Contact already exists',
      });
    }

    const contact = await Contact.create({
      owner: req.user._id,
      contact: userId,
      nickname: nickname || '',
      addedVia: addedVia || 'username',
    });

    // Populate the contact field before returning
    const populatedContact = await Contact.findById(contact._id).populate(
      'contact',
      'username displayName avatar phone email isOnline lastSeen statusText bio'
    );

    res.status(201).json({
      success: true,
      data: populatedContact,
    });
  } catch (error) {
    console.error('addContact error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while adding contact',
    });
  }
};

// @desc    Get all contacts for the logged-in user
// @route   GET /api/v1/contacts
// @access  Private
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ owner: req.user._id })
      .populate(
        'contact',
        'username displayName avatar phone email isOnline lastSeen statusText bio'
      )
      .sort({ nickname: 1 })
      .lean();

    // Secondary sort: if nickname is empty, fall back to displayName
    contacts.sort((a, b) => {
      const nameA = (a.nickname || a.contact?.displayName || '').toLowerCase();
      const nameB = (b.nickname || b.contact?.displayName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    console.error('getContacts error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contacts',
    });
  }
};

// @desc    Remove a contact
// @route   DELETE /api/v1/contacts/:contactId
// @access  Private
exports.removeContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.contactId,
      owner: req.user._id,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Contact removed successfully',
    });
  } catch (error) {
    console.error('removeContact error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while removing contact',
    });
  }
};

// @desc    Toggle favorite status of a contact
// @route   PUT /api/v1/contacts/:contactId/favorite
// @access  Private
exports.toggleFavorite = async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.contactId,
      owner: req.user._id,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    contact.isFavorite = !contact.isFavorite;
    await contact.save();

    const populatedContact = await Contact.findById(contact._id).populate(
      'contact',
      'username displayName avatar phone email isOnline lastSeen statusText bio'
    );

    res.status(200).json({
      success: true,
      data: populatedContact,
    });
  } catch (error) {
    console.error('toggleFavorite error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling favorite',
    });
  }
};

// @desc    Toggle block status of a contact
// @route   PUT /api/v1/contacts/:contactId/block
// @access  Private
exports.toggleBlock = async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.contactId,
      owner: req.user._id,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    contact.isBlocked = !contact.isBlocked;
    await contact.save();

    const populatedContact = await Contact.findById(contact._id).populate(
      'contact',
      'username displayName avatar phone email isOnline lastSeen statusText bio'
    );

    res.status(200).json({
      success: true,
      data: populatedContact,
    });
  } catch (error) {
    console.error('toggleBlock error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling block',
    });
  }
};

// @desc    Check if a specific user is in the logged-in user's contacts
// @route   GET /api/v1/contacts/check/:userId
// @access  Private
exports.checkContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({
      owner: req.user._id,
      contact: req.params.userId,
    }).populate(
      'contact',
      'username displayName avatar phone email isOnline lastSeen statusText bio'
    );

    res.status(200).json({
      success: true,
      isContact: !!contact,
      data: contact || null,
    });
  } catch (error) {
    console.error('checkContact error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while checking contact',
    });
  }
};

// @desc    Sync local address book contacts with database
// @route   POST /api/v1/contacts/sync
// @access  Private
exports.syncContacts = async (req, res) => {
  try {
    const { contacts } = req.body; // array of { name, phone }
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ success: false, message: 'Contacts array is required' });
    }

    const syncedList = [];

    for (const item of contacts) {
      if (!item.phone) continue;
      const cleaned = item.phone.replace(/\D/g, '');
      if (cleaned.length < 10) continue;
      const last10 = cleaned.slice(-10);

      // Find user by phone suffix match
      const matchedUser = await User.findOne({
        phone: new RegExp(last10 + '$'),
        _id: { $ne: req.user._id } // Don't add yourself
      });

      if (matchedUser) {
        // See if already a contact
        let contactDoc = await Contact.findOne({
          owner: req.user._id,
          contact: matchedUser._id
        });

        if (!contactDoc) {
          contactDoc = await Contact.create({
            owner: req.user._id,
            contact: matchedUser._id,
            nickname: item.name || matchedUser.displayName || matchedUser.username,
            addedVia: 'phone'
          });
        }

        const populated = await Contact.findById(contactDoc._id).populate(
          'contact',
          'username displayName avatar phone email isOnline lastSeen statusText bio'
        );

        syncedList.push(populated);
      }
    }

    res.status(200).json({
      success: true,
      data: syncedList
    });
  } catch (error) {
    console.error('syncContacts error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while syncing contacts'
    });
  }
};
