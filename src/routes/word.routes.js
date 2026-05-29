const express = require('express')

const prisma = require('../lib/prisma')
const auth = require('../middlewares/auth')

const router = express.Router()

function getDifficultyScore(word) {
  return word.wrongCount / (word.correctCount + 1)
}

function selectWordsByDifficulty(words, limit = 10) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 10, 4), 30)

  return [...words]
    .sort((a, b) => {
      const scoreDiff = getDifficultyScore(b) - getDifficultyScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return b.wrongCount - a.wrongCount || Math.random() - 0.5
    })
    .slice(0, cappedLimit)
}

router.post('/words', auth, async (req, res) => {
    try {
      const {
        englishWord,
        portugueseWord,
        englishSentence,
        portugueseSentence
      } = req.body

      if (
        englishWord == null ||
        portugueseWord == null ||
        englishSentence == null ||
        portugueseSentence == null
      ) {
        return res.status(400).json({
          error:
            'Campos obrigatórios: englishWord, portugueseWord, englishSentence, portugueseSentence'
        })
      }

      const userId = Number(req.userId)
      if (!Number.isInteger(userId)) {
        return res.status(401).json({ error: 'Token inválido' })
      }

      const word = await prisma.word.create({
        data: {
          englishWord: String(englishWord),
          portugueseWord: String(portugueseWord),
          englishSentence: String(englishSentence),
          portugueseSentence: String(portugueseSentence),
          userId
        }
      })
  
      res.status(201).json(word)
  
    } catch (error) {
      console.log(error)
  
      res.status(500).json({
        error: 'Erro interno'
      })
    }
  })

  
  router.get('/words', auth, async (req, res) => {
    try {
      const words = await prisma.word.findMany({
        where: {
          userId: req.userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
  
      res.json(words)
  
    } catch (error) {
      res.status(500).json({
        error: 'Erro interno'
      })
    }
  })

  router.put('/words/:id', auth, async (req, res) => {
    try {
      const { id } = req.params
  
      const {
        englishWord,
        portugueseWord,
        englishSentence,
        portugueseSentence
      } = req.body
  
      const word = await prisma.word.findFirst({
        where: {
          id: Number(id),
          userId: req.userId
        }
      })
  
      if (!word) {
        return res.status(404).json({
          error: 'Palavra não encontrada'
        })
      }
  
      const updatedWord = await prisma.word.update({
        where: {
          id: Number(id)
        },
        data: {
          englishWord,
          portugueseWord,
          englishSentence,
          portugueseSentence
        }
      })
  
      res.json(updatedWord)
  
    } catch (error) {
      console.log(error)
  
      res.status(500).json({
        error: 'Erro interno'
      })
    }
  })

  router.delete('/words/:id', auth, async (req, res) => {
    try {
      const { id } = req.params
  
      const word = await prisma.word.findFirst({
        where: {
          id: Number(id),
          userId: req.userId
        }
      })
  
      if (!word) {
        return res.status(404).json({
          error: 'Palavra não encontrada'
        })
      }
  
      await prisma.word.delete({
        where: {
          id: Number(id)
        }
      })
  
      res.json({
        message: 'Palavra deletada com sucesso'
      })
  
    } catch (error) {
      console.log(error)
  
      res.status(500).json({
        error: 'Erro interno'
      })
    }
  })

  router.get('/quiz', auth, async (req, res) => {
    try {
      const words = await prisma.word.findMany({
        where: {
          userId: req.userId
        }
      })
  
      if (words.length < 4) {
        return res.status(400).json({
          error: 'Cadastre pelo menos 4 palavras'
        })
      }
  
      const selectedWords = selectWordsByDifficulty(words, req.query.limit)
  
      const quiz = selectedWords.map(word => {
  
        const wrongOptions = words
          .filter(w => w.id !== word.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(w => w.portugueseWord)
  
        const options = [
          word.portugueseWord,
          ...wrongOptions
        ].sort(() => Math.random() - 0.5)
  
        return {
          id: word.id,
          englishWord: word.englishWord,
          options,
          correctAnswer: word.portugueseWord
        }
      })
  
      res.json(quiz)
  
    } catch (error) {
      console.log(error)
  
      res.status(500).json({
        error: 'Erro interno'
      })
    }
  })

  router.get('/match-pairs', auth, async (req, res) => {
    try {
      const words = await prisma.word.findMany({
        where: {
          userId: req.userId
        }
      })

      if (words.length < 4) {
        return res.status(400).json({
          error: 'Cadastre pelo menos 4 palavras'
        })
      }

      const selectedWords = selectWordsByDifficulty(words, req.query.limit)

      res.json(selectedWords)
    } catch (error) {
      console.log(error)

      res.status(500).json({
        error: 'Erro interno'
      })
    }
  })

  router.post('/quiz/answer', auth, async (req, res) => {
    try {
      const { wordId, isCorrect } = req.body
  
      const id = Number(wordId)

      if (!Number.isInteger(id) || typeof isCorrect !== 'boolean') {
        return res.status(400).json({
          error: 'wordId e isCorrect são obrigatórios'
        })
      }

      const word = await prisma.word.findFirst({
        where: {
          id,
          userId: req.userId
        }
      })
  
      if (!word) {
        return res.status(404).json({
          error: 'Palavra não encontrada'
        })
      }
  
      const updatedWord = await prisma.word.update({
        where: {
          id
        },
        data: isCorrect
          ? { correctCount: { increment: 1 } }
          : { wrongCount: { increment: 1 } }
      })
  
      res.json(updatedWord)
    } catch (error) {
      console.log(error)
  
      res.status(500).json({
        error: 'Erro interno'
      })
    }
  })

  module.exports = router