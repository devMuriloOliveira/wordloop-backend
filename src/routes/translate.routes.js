const express = require('express')
const axios = require('axios')
const auth = require('../middlewares/auth')

const router = express.Router()

const libreTranslateUrls = [
  'https://translate.cutie.dating/translate',
  'https://translate.fedilab.app/translate'
]

async function translateWithFallback(payload) {
  let lastError = null

  for (const url of libreTranslateUrls) {
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      return response.data.translatedText
    } catch (error) {
      lastError = error
      console.log(`Erro na API ${url}:`, error.response?.data || error.message)
    }
  }

  throw lastError
}

router.post('/translate', auth, async (req, res) => {
  try {
    const { text, sourceLang = 'pt', targetLang = 'en' } = req.body

    if (!text) {
      return res.status(400).json({
        error: 'Texto é obrigatório'
      })
    }

    const translation = await translateWithFallback({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text'
    })

    res.json({
      translation
    })
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao traduzir texto'
    })
  }
})

module.exports = router