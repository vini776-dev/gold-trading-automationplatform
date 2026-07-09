const queue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const task = queue[0];
  const botToken = process.env.TELEGRAM_BOT_TOKEN || task.botToken;
  const chatId = process.env.TELEGRAM_CHAT_ID || task.chatId;

  if (!botToken || !chatId) {
    console.error('Telegram config missing: Bot Token or Chat ID not found.');
    queue.shift(); // Remove from queue
    isProcessing = false;
    processQueue();
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: task.message,
      }),
    });

    if (response.ok) {
      console.log('Telegram notification sent successfully.');
      queue.shift(); // Success, remove from queue
    } else {
      const errorText = await response.text();
      throw new Error(`Telegram API Error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`Telegram attempt failed: ${error.message}`);
    task.attempts += 1;

    if (task.attempts >= 3) {
      console.error(`Telegram notification failed permanently after 3 attempts: "${task.message}"`);
      queue.shift(); // Exhausted retries, remove
    } else {
      // Cooldown delay before next retry (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  isProcessing = false;
  // Trigger next item in the queue
  processQueue();
};

const sendTelegramNotification = (message, botToken = null, chatId = null) => {
  // Push the message request onto the background queue (non-blocking)
  queue.push({
    message,
    botToken,
    chatId,
    attempts: 0,
  });
  
  // Asynchronously trigger processing without blocking the caller thread
  processQueue();
};

module.exports = {
  sendTelegramNotification,
};
