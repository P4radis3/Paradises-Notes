const TelegramBot = require('node-telegram-bot-api');
const config = require('config');

const fs = require('fs');
const path = require('path');

const TOKEN = config.get('token');
const bot = new TelegramBot(TOKEN, { polling: true });
const todoFilePath = path.join(__dirname, 'todo.json');

/*bot.on('inline_query', query => {
    console.log(query);
    const results = [];

    for (let index = 0; index < 3; index++) {
        results.push({
            id: index.toString(),
            type: 'article',
            title: `Title, #${index}`,
            input_message_content: {
                message_text: `Article #${index} description.`
            }
        })
    }

    bot.answerInlineQuery(query.id, results, {
        cache_time: 0,
        switch_pm_text: 'Stay in touch with the the bot.',
        switch_pm_parameter: 'Hello'
    })
});*/

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


/*function loadTodoItems() {
    try {
        const data = fs.readFileSync(todoFilePath);
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}*/

const todoItems = [];
bot.onText(/^\/add(?:\s+(.+)|\s*)$/, (message, [source, todoItem]) => {
    const userId = message.from.id;
    
    if (!todoItem) {
        bot.sendMessage(message.chat.id, `Please provide a to-do item.`);
    } else {
        todoItems.push({ userId: userId, text: todoItem, completed: false });
        bot.sendMessage(message.chat.id, `Added "${todoItem}" to your to-do list.`);
    }
});


/*bot.onText(/\/add (.+)/, (message, [source, todoItem]) => {

    const userId = message.from.id;
    if (!todoItem) {
        bot.sendMessage(message.chat.id, `Please provide a to-do item.`);
    } else {
        todoItems.push({ userId: userId, text: todoItem, completed: false });
        bot.sendMessage(message.chat.id, `Added "${todoItem}" to your to-do list.`);
    }
});*/

bot.onText(/\/list/, (message) => {

    const userId = message.from.id;
    const userTodoItems = todoItems.filter(item => item.userId === userId);
    const todoList = userTodoItems.map(item => item.text).join('\n');
    bot.sendMessage(message.chat.id, `Your to-do list:\n${todoList}`);

});

/*function saveTodoItems(todoItems) {
    const data = JSON.stringify(todoItems);
    fs.writeFileSync(todoFilePath, data);
}

bot.onText(/\add (.+)/, (message, [source, todoItem]) => {

    const userId = message.from.id;
    const todoItems = loadTodoItems();

    todoItems.push({ userId: userId, text: todoItem, completed: false });
    saveTodoItems(todoItems);
    bot.sendMessage(message.chat.id, `Added "${todoItem}" to your to-do list.`);

});*/

/*bot.onText(/\list/, (message) => {

    const userId = message.from.id;
    const todoItems = loadTodoItems();

    const userTodoItems = todoItems.filter(item => item.userId === userId);
    const todoList = userTodoItems.map(item => item.text).join('\n');

    bot.sendMessage(message.chat.id, `Your To-Do list:\n${todoList}`);

})*/