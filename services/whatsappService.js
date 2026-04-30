const axios = require('axios');

const getUrl = (config) => {
    const version = config.version || process.env.GRAPH_API_VERSION || 'v17.0';
    const phoneId = config.phoneNumberId || process.env.PHONE_NUMBER_ID;
    return `https://graph.facebook.com/${version}/${phoneId}/messages`;
};

const getHeaders = (config) => {
    const token = config.whatsappToken || process.env.WHATSAPP_TOKEN;
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const sendTextMessage = async (to, message, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Text Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendButtonMessage = async (to, bodyText, buttons, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: bodyText },
                action: {
                    buttons: buttons.map(button => ({
                        type: 'reply',
                        reply: { id: button.id, title: button.title }
                    }))
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Button Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendListMessage = async (to, bodyText, buttonText, sections, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'list',
                body: { text: bodyText },
                action: { 
                    button: (buttonText || 'Select').slice(0, 20), 
                    sections: sections.map(s => ({
                        ...s,
                        title: (s.title || '').slice(0, 24)
                    }))
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp List Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendImageMessage = async (to, imageUrl, caption = '', config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'image',
            image: { link: imageUrl, caption }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Image Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendProductCardMessage = async (to, product, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                header: { type: 'image', image: { link: product.image } },
                body: {
                    text: `🔥 ${product.name}\n\n💰 ₹${product.price}\n\n📝 ${product.description}`
                },
                footer: { text: 'WStore 🛍️' },
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: `add_${product.id}`, title: 'Add To Cart' } },
                        { type: 'reply', reply: { id: `buy_${product.id}`, title: 'Buy Now' } }
                    ]
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Product Card Error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendImageMessage,
    sendProductCardMessage
};