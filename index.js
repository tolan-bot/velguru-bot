const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// Environment variables
const BOT_TOKEN = process.env.VELGURU_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

console.log('VelGuru bot starting...');
console.log('Webhook URL:', WEBHOOK_URL);

// Create Express app
const app = express();
app.use(express.json());

// Create bot instance (without polling for webhook mode)
const bot = new TelegramBot(BOT_TOKEN);

// User sessions storage
const userSessions = new Map();

// Simple ingredient database
const ingredients = {
  'retinol': {
    name: 'Retinol',
    category: 'anti-aging',
    max_concentration: 1.0,
    benefits: ['reduces wrinkles', 'improves texture', 'increases cell turnover'],
    incompatible_with: ['vitamin_c', 'aha_acids']
  },
  'niacinamide': {
    name: 'Niacinamide',
    category: 'multi-purpose',
    max_concentration: 10.0,
    benefits: ['controls oil', 'minimizes pores', 'brightening'],
    compatible_with: ['most_ingredients']
  },
  'hyaluronic_acid': {
    name: 'Hyaluronic Acid',
    category: 'hydrating',
    max_concentration: 2.0,
    benefits: ['intense hydration', 'plumping effect', 'suitable for all skin types'],
    compatible_with: ['all_ingredients']
  },
  'vitamin_c': {
    name: 'Vitamin C (L-Ascorbic Acid)',
    category: 'antioxidant',
    max_concentration: 20.0,
    benefits: ['brightening', 'antioxidant protection', 'collagen synthesis'],
    incompatible_with: ['retinol', 'aha_acids']
  }
};

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    await handleTelegramUpdate(update);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('🧪 VelGuru Bot is running! Ready to formulate amazing skincare products.');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'VelGuru Bot',
    timestamp: new Date().toISOString()
  });
});

// Handle Telegram updates
async function handleTelegramUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}

// Handle messages
async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text;

  // Initialize user session
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      currentStep: 'idle',
      formulation: {},
      selectedIngredients: []
    });
  }

  const session = userSessions.get(userId);

  try {
    if (text.startsWith('/')) {
      await handleCommand(chatId, text, session);
    } else {
      await handleUserInput(chatId, text, session);
    }
  } catch (error) {
    console.error('Message handling error:', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred. Please try again with /start');
  }
}

// Handle commands
async function handleCommand(chatId, command, session) {
  const cmd = command.split(' ')[0];

  switch (cmd) {
    case '/start':
      await sendWelcomeMessage(chatId);
      break;

    case '/formulate':
      await startFormulation(chatId, session);
      break;

    case '/ingredients':
      await showIngredients(chatId);
      break;

    case '/compatibility':
      await startCompatibilityCheck(chatId, session);
      break;

    case '/help':
      await sendHelpMessage(chatId);
      break;

    default:
      await bot.sendMessage(chatId, 'Unknown command. Use /help to see available commands.');
  }
}

// Send welcome message
async function sendWelcomeMessage(chatId) {
  const welcomeText = `🧪 **VelGuru Formulation Assistant**

Welcome! I'm your AI-powered skincare formulation expert.

**What I can help you with:**
✨ Create custom skincare formulations
🔬 Check ingredient compatibility  
📊 Suggest optimal concentrations
🛡️ Assess safety profiles
💡 Recommend ingredients for specific concerns

**Available Commands:**
/formulate - Start creating a formulation
/ingredients - Browse ingredient database
/compatibility - Check ingredient compatibility
/help - Show this help message

Ready to create amazing skincare products? 🚀`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🧪 Start Formulation', callback_data: 'start_formulation' },
        { text: '📚 Browse Ingredients', callback_data: 'browse_ingredients' }
      ],
      [
        { text: '🔬 Check Compatibility', callback_data: 'check_compatibility' },
        { text: '❓ Help', callback_data: 'help' }
      ]
    ]
  };

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Start formulation process
async function startFormulation(chatId, session) {
  session.currentStep = 'select_product_type';
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🧴 Cleanser', callback_data: 'product_cleanser' },
        { text: '🧪 Serum', callback_data: 'product_serum' }
      ],
      [
        { text: '🍯 Moisturizer', callback_data: 'product_moisturizer' },
        { text: '🌞 Sunscreen', callback_data: 'product_sunscreen' }
      ],
      [
        { text: '🎭 Face Mask', callback_data: 'product_mask' },
        { text: '👁️ Eye Cream', callback_data: 'product_eye' }
      ]
    ]
  };

  await bot.sendMessage(chatId, 
    '🧪 **Formulation Wizard**\n\nWhat type of product would you like to create?', 
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );
}

// Show ingredients database
async function showIngredients(chatId) {
  let text = '📚 **Available Ingredients Database:**\n\n';
  
  Object.values(ingredients).forEach(ingredient => {
    text += `**${ingredient.name}**\n`;
    text += `• Category: ${ingredient.category}\n`;
    text += `• Max concentration: ${ingredient.max_concentration}%\n`;
    text += `• Benefits: ${ingredient.benefits.join(', ')}\n\n`;
  });

  text += 'Use /formulate to start creating a formulation with these ingredients!';

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

// Start compatibility check
async function startCompatibilityCheck(chatId, session) {
  session.currentStep = 'compatibility_input';
  
  await bot.sendMessage(chatId, 
    `🔬 **Ingredient Compatibility Checker**

Please enter the ingredients you want to check (one per line):

Example:
Retinol
Vitamin C
Niacinamide

Or use /start to go back to the main menu.`
  );
}

// Handle user input based on current step
async function handleUserInput(chatId, text, session) {
  switch (session.currentStep) {
    case 'compatibility_input':
      await checkCompatibility(chatId, text, session);
      break;
    
    default:
      await bot.sendMessage(chatId, 
        'Please use one of the available commands:\n/start, /formulate, /ingredients, /compatibility, /help'
      );
  }
}

// Check ingredient compatibility
async function checkCompatibility(chatId, text, session) {
  const inputIngredients = text.toLowerCase().split('\n').map(ing => ing.trim());
  let results = '🔬 **Compatibility Analysis:**\n\n';
  
  const foundIngredients = [];
  const notFoundIngredients = [];
  
  inputIngredients.forEach(input => {
    const found = Object.keys(ingredients).find(key => 
      ingredients[key].name.toLowerCase().includes(input) || key.includes(input)
    );
    
    if (found) {
      foundIngredients.push(ingredients[found]);
    } else {
      notFoundIngredients.push(input);
    }
  });

  if (foundIngredients.length === 0) {
    results += '❌ No recognized ingredients found. Please check spelling.\n\n';
    results += 'Available ingredients: ' + Object.values(ingredients).map(ing => ing.name).join(', ');
  } else {
    results += '✅ **Recognized Ingredients:**\n';
    foundIngredients.forEach(ing => {
      results += `• ${ing.name}\n`;
    });
    results += '\n';

    // Check for incompatibilities
    let incompatibilities = [];
    foundIngredients.forEach(ing1 => {
      foundIngredients.forEach(ing2 => {
        if (ing1 !== ing2 && ing1.incompatible_with && 
            ing1.incompatible_with.some(incomp => ing2.name.toLowerCase().includes(incomp.replace('_', ' ')))) {
          incompatibilities.push(`${ing1.name} + ${ing2.name}`);
        }
      });
    });

    if (incompatibilities.length > 0) {
      results += '⚠️ **Potential Incompatibilities:**\n';
      incompatibilities.forEach(incomp => {
        results += `• ${incomp}\n`;
      });
      results += '\n**Recommendation:** Use these ingredients at different times or in separate products.\n\n';
    } else {
      results += '✅ **No major incompatibilities detected!**\n';
      results += 'These ingredients should work well together.\n\n';
    }

    if (notFoundIngredients.length > 0) {
      results += '❓ **Unrecognized ingredients:**\n';
      notFoundIngredients.forEach(ing => {
        results += `• ${ing}\n`;
      });
    }
  }

  results += '\nUse /formulate to create a complete formulation!';

  await bot.sendMessage(chatId, results, { parse_mode: 'Markdown' });
  session.currentStep = 'idle';
}

// Handle callback queries
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  const session = userSessions.get(userId) || { currentStep: 'idle', formulation: {}, selectedIngredients: [] };
  userSessions.set(userId, session);

  try {
    await bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'start_formulation':
        await startFormulation(chatId, session);
        break;
      
      case 'browse_ingredients':
        await showIngredients(chatId);
        break;
      
      case 'check_compatibility':
        await startCompatibilityCheck(chatId, session);
        break;
      
      case 'help':
        await sendHelpMessage(chatId);
        break;

      default:
        if (data.startsWith('product_')) {
          await handleProductSelection(chatId, data, session);
        }
    }
  } catch (error) {
    console.error('Callback query error:', error);
  }
}

// Handle product type selection
async function handleProductSelection(chatId, data, session) {
  const productType = data.replace('product_', '');
  session.formulation.productType = productType;
  
  let response = `Great choice! You selected **${productType}**.\n\n`;
  
  // Suggest ingredients based on product type
  const suggestions = getProductSuggestions(productType);
  response += `**Recommended ingredients for ${productType}:**\n`;
  suggestions.forEach(suggestion => {
    response += `• ${suggestion}\n`;
  });
  
  response += '\nUse /ingredients to see full database or /compatibility to check ingredient combinations!';

  await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
}

// Get product-specific suggestions
function getProductSuggestions(productType) {
  const suggestions = {
    'serum': ['Hyaluronic Acid (hydration)', 'Niacinamide (pore control)', 'Vitamin C (brightening)'],
    'moisturizer': ['Hyaluronic Acid', 'Ceramides', 'Peptides'],
    'cleanser': ['Gentle surfactants', 'Niacinamide', 'Salicylic Acid (for oily skin)'],
    'sunscreen': ['Zinc Oxide', 'Titanium Dioxide', 'Chemical UV filters'],
    'mask': ['Clay (for oily skin)', 'Hyaluronic Acid (hydrating)', 'AHA/BHA (exfoliating)'],
    'eye': ['Peptides', 'Caffeine', 'Gentle moisturizers']
  };
  
  return suggestions[productType] || ['Consult ingredient database for specific recommendations'];
}

// Send help message
async function sendHelpMessage(chatId) {
  const helpText = `🆘 **VelGuru Help Guide**

**Available Commands:**
• /start - Main menu and welcome
• /formulate - Create custom formulations
• /ingredients - Browse ingredient database  
• /compatibility - Check ingredient compatibility
• /help - Show this help message

**How to use:**
1. Start with /formulate to create a product
2. Select your product type
3. Get ingredient recommendations
4. Use /compatibility to check combinations
5. Build your perfect formulation!

**Features:**
✅ Product type guidance
✅ Ingredient compatibility checking
✅ Concentration recommendations  
✅ Safety assessments
✅ Professional formulation advice

Need help? Just type /start to begin! 🧪`;

  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

// Set up webhook
async function setupWebhook() {
  try {
    const webhookUrl = `${WEBHOOK_URL}/webhook`;
    await bot.setWebHook(webhookUrl);
    console.log(`✅ Webhook set up successfully: ${webhookUrl}`);
  } catch (error) {
    console.error('❌ Webhook setup failed:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 VelGuru Bot server running on port ${PORT}`);
  
  if (WEBHOOK_URL && BOT_TOKEN) {
    await setupWebhook();
    console.log('🤖 VelGuru Bot is ready for formulation requests!');
  } else {
    console.error('❌ Missing environment variables. Check BOT_TOKEN and WEBHOOK_URL');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 VelGuru Bot shutting down...');
  process.exit(0);
});
