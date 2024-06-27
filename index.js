const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const fs = require('fs');
const path = require('path');

const TOKEN = config.get('token');
const bot = new TelegramBot(TOKEN, { polling: true });

const filePath = path.join(__dirname, 'userdata.json');

let userData = {};
if (fs.existsSync(filePath)) {
    const userDataFile = fs.readFileSync(filePath, 'utf8').trim();
    if (userDataFile) { userData = JSON.parse(userDataFile); }
}

const saveToDos = () => { fs.writeFileSync(filePath, JSON.stringify(userData, null, 2)); };
bot.on('callback_query', query => { bot.answerCallbackQuery(query.id, `${query.data}`); });

bot.onText(/\/start/, (message) => {
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
                        text: 'Contribute to the bot.',
                        url: 'https://github.com/P4radis3/Telegram-Bot'
                    }
                ]
            ]
        }
    });
});

bot.onText(/^\/add$/, (message) => {
    const userId = message.from.id;
    bot.sendMessage(message.chat.id, `Enter a to-do item you want to add to your list:`);

    bot.once('message', (inputMessage) => {
        const todoItem = inputMessage.text;
        if (!todoItem) {
            bot.sendMessage(message.chat.id, `You cannot add an empty item to the to-do list.`); return;
        }

        const isLink = todoItem.startsWith('http');
        if (!userData[userId]) { userData[userId] = []; }
        userData[userId].push({ text: todoItem, isLink: isLink, completed: false });
        saveToDos();
        bot.sendMessage(message.chat.id, `Added "${todoItem}" to your to-do list.`);
    });
});


bot.onText(/\/list/, (message) => {

    const userId = message.from.id; const userTodoItems = userData[userId] || [];
    let todoList = 'Your To-Do List:\n';
    userTodoItems.forEach(item => { if (item.isLink) { todoList += `🔗 ${item.text}\n`; } else { todoList += `📝 ${item.text}\n`; } })
    bot.sendMessage(message.chat.id, todoList, { parse_mode: 'HTML' });

});

process.on('SIGINT', () => { saveToDos(); process.exit(); });
let lastDeleted = {};
const deleteItem = (chatId, todoItems) => {

    const keyboard = {
        keyboard: todoItems.map((item, index) => [{ text: `${index + 1}. ${item.text}` }]),
        resize_keyboard: true,
        one_time_keyboard: true
    };

    bot.sendMessage(chatId, 'Select an item to delete:', { reply_markup: keyboard });

};

const undoDelete = (chatId) => {

    const keyboard = { inline_keyboard: [[{ text: 'Undo and retrieve the last item you deleted.', callback_data: 'Undid deletion.' }]] };
    bot.sendMessage(chatId, 'To undo the deletion, click the button below:', { reply_markup: keyboard });

};

bot.onText(/\/delete/, (message) => {

    const userId = message.from.id;
    const userToDoList = userData[userId] || [];
    if (userToDoList.length === 0) { bot.sendMessage(message.chat.id, 'Your to-do list is empty.'); } else { deleteItem(message.chat.id, userToDoList); }

    bot.once('message', (deleteMessage) => {

        const index = parseInt(deleteMessage.text) - 1;
        if (!isNaN(index) && index >= 0 && index < userToDoList.length) {

            lastDeleted[userId] = userToDoList.splice(index, 1)[0];
            saveToDos();
            bot.sendMessage(message.chat.id, `Deleted "${lastDeleted[userId].text}" from your to-do list.`);
            undoDelete(message.chat.id);

        } /*else {
            bot.sendMessage(message.chat.id, 'Invalid selection. Please select a valid to-do item to delete.');
        }*/
    });
});

bot.on('callback_query', query => {
    if (query.data === 'Undid deletion.') {

        const userId = query.from.id;
        if (lastDeleted[userId]) {

            userData[userId].push(lastDeleted[userId]);
            delete lastDeleted[userId];
            saveUserDataToFile();
            bot.answerCallbackQuery(query.id, 'Last deletion undone.');

        } else { bot.answerCallbackQuery(query.id, 'No deletion to undo.'); }
    }
});


const editSessions = {};
bot.onText(/^\/edit/, (message) => {
    const userId = message.from.id;
    const userToDoList = userData[userId] || [];

    if (userToDoList.length === 0) {
        bot.sendMessage(message.chat.id, 'Your to-do list is empty.');
    } else {
        userEdit(message.chat.id, userId, userToDoList);
    }
});

const userEdit = (chatId, userId, todoItems) => {
    const editSessionId = `${userId}_${Date.now()}`;
    editSessions[editSessionId] = { userId, todoItems };

    const keyboard = {
        keyboard: todoItems.map((item, index) => [{
            text: `${index + 1}. ${item.isLink ? '🔗' : '📝'} ${item.text}`
        }]),
        resize_keyboard: true,
        one_time_keyboard: true
    };

    bot.sendMessage(chatId, 'Select an item to edit:', { reply_markup: keyboard });

    userData[userId].editSessionId = editSessionId;
    saveToDos();
    bot.once('message', (editMessage) => {
        edit(editMessage, editSessionId);
    });

};

const edit = (editMessage, editSessionId) => {
    const [userId, timestamp] = editSessionId.split('_');
    const todoItems = editSessions[editSessionId].todoItems;
    const index = parseInt(editMessage.text) - 1;

    if (!isNaN(index) && index >= 0 && index < todoItems.length) {
        const selectedItem = todoItems[index];
        bot.sendMessage(userId, `Enter the new text for "${selectedItem.text}":`).then(() => {
            bot.once('message', (newTextMessage) => { newTextFromUser(newTextMessage, editSessionId, selectedItem); });
        });
    } else {
        bot.sendMessage(userId, 'Invalid selection. Please select a valid to-do item to edit.');
    }
};

const newTextFromUser = (newTextMessage, editSessionId, selectedItem) => {

    const [userId, timestamp] = editSessionId.split('_');
    const newText = newTextMessage.text;
    selectedItem.text = newText;

    if (selectedItem.isLink && !newText.startsWith('http')) {
        selectedItem.isLink = false;
    } else if (!selectedItem.isLink && newText.startsWith('http')) {
        selectedItem.isLink = true;
    }

    bot.sendMessage(userId, `Successfully edited "${selectedItem.text}".`);
    delete editSessions[editSessionId];
    delete userData[userId].editSessionId;
    saveToDos();

};