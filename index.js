const TelegramBot = require('node-telegram-bot-api');
const config = require('config');

const path = require('path');

const TOKEN = config.get('token');
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('callback_query', query => {
    bot.answerCallbackQuery(query.id, `${query.data}`)
});

bot.onText(/\/welcome/, (message, /*[source, match]*/) => {
    const { chat: { id }, from: { username } } = message;
    bot.sendMessage(id, `Hello, ${username}! Thanks for using my bot! Have a look through the buttons labeled 'IMPORTANT'`, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'My personal GitHub',
                        url: 'https://github.com/p4radis3'
                    },
                    {
                        text: 'Reach out via EMail.',
                        url: 'https://mail.google.com/mail/u/0/#inbox?compose=DmwnWrRlQQFBzdkwtrNnZXqrRJCXfMnkzbHFqmxnPsbJMRmhfsCNzhQrJQszfwtfMTDhllxVWPQv'
                    }
                ],
                [
                    {
                        text: 'IMPORTANT #1!',
                        callback_data: 'Please, be aware! The bot is still in development!'
                    },
                    {
                        text: 'IMPORTANT #2!',
                        callback_data: 'If you have any recommendations, please contact me!'
                    }
                ],
                [
                    {
                        text: 'Add more To-Do\'s and stay in touch!',
                        switch_inline_query_current_chat: 'Use the /add command to add a new item!'
                    }
                ]
            ]
        }
    });
});

const todoItems = [];
bot.onText(/^\/add(?:\s+(.+)|\s*)$/, (message, [source, todoItem]) => {

    const userId = message.from.id;
    if (!todoItem) {

        bot.sendMessage(message.chat.id, `Please provide a to-do item.`);

    } else {

        const isLink = todoItem.startsWith('http');
        todoItems.push({
            userId: userId,
            text: todoItem,
            isLink: isLink,
            completed: false
        });
        
        bot.sendMessage(message.chat.id, `Added "${todoItem}" to your to-do list.`);

    }
});

bot.onText(/\/list/, (message) => {

    const userId = message.from.id;
    const usersTodoItems = todoItems.filter(item => item.userId === userId);
    let todoList = 'Your To-Do List:\n';

    usersTodoItems.forEach(item => {
        if (item.isLink) {
            todoList += `🔗 ${item.text}\n`;
        } else {
            todoList += `📝 ${item.text}\n`;
        }
    })

    bot.sendMessage(message.chat.id, todoList, { parse_mode: 'HTML' });

});