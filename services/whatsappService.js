const axios = require('axios');

const sendTextMessage = async (
    to,
    message
) => {

    try {

        const url =
            `https://graph.facebook.com/${process.env.GRAPH_API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;

        await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: {
                    body: message
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type':
                        'application/json'
                }
            }
        );

    } catch (error) {

        console.error(
            error.response?.data || error.message
        );
    }
};

const sendButtonMessage = async (
    to,
    bodyText,
    buttons
) => {

    try {

        const url =
            `https://graph.facebook.com/${process.env.GRAPH_API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;

        await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: {
                        text: bodyText
                    },
                    action: {
                        buttons: buttons.map(button => ({
                            type: 'reply',
                            reply: {
                                id: button.id,
                                title: button.title
                            }
                        }))
                    }
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type':
                        'application/json'
                }
            }
        );

    } catch (error) {

        console.error(
            error.response?.data || error.message
        );
    }
};

const sendListMessage = async (
    to,
    bodyText,
    buttonText,
    sections
) => {

    try {

        const url =
            `https://graph.facebook.com/${process.env.GRAPH_API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;

        await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    body: {
                        text: bodyText
                    },
                    action: {
                        button: buttonText,
                        sections
                    }
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type':
                        'application/json'
                }
            }
        );

    } catch (error) {

        console.error(
            error.response?.data || error.message
        );
    }
};

const sendImageMessage = async (
    to,
    imageUrl,
    caption = ''
) => {

    try {

        const url =
            `https://graph.facebook.com/${process.env.GRAPH_API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;

        await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'image',
                image: {
                    link: imageUrl,
                    caption
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type':
                        'application/json'
                }
            }
        );

    } catch (error) {

        console.error(
            error.response?.data || error.message
        );
    }
};


const sendProductCardMessage = async (
    to,
    product
) => {

    try {

        const url =
            `https://graph.facebook.com/${process.env.GRAPH_API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;

        await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'interactive',

                interactive: {

                    type: 'button',

                    // =========================
                    // IMAGE HEADER
                    // =========================

                    header: {
                        type: 'image',
                        image: {
                            link: product.image
                        }
                    },

                    // =========================
                    // PRODUCT DETAILS
                    // =========================

                    body: {
                        text:
`🔥 ${product.name}

💰 ₹${product.price}

📝 ${product.description}`
                    },

                    // =========================
                    // FOOTER
                    // =========================

                    footer: {
                        text: 'WStore 🛍️'
                    },

                    // =========================
                    // BUTTONS
                    // =========================

                    action: {
                        buttons: [

                            {
                                type: 'reply',

                                reply: {
                                    id: `add_${product.id}`,
                                    title: 'Add To Cart'
                                }
                            },

                            {
                                type: 'reply',

                                reply: {
                                    id: `buy_${product.id}`,
                                    title: 'Buy Now'
                                }
                            }
                        ]
                    }
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.WHATSAPP_TOKEN}`,

                    'Content-Type':
                        'application/json'
                }
            }
        );

    } catch (error) {

        console.error(
            error.response?.data || error.message
        );
    }
};

module.exports = {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendImageMessage,
    sendProductCardMessage
};