const express = require('express')
const bcrypt = require('bcrypt')
const prisma = require('../lib/prisma')
const jwt = require('jsonwebtoken')
const auth = require('../middlewares/auth')
const router = express.Router()
// const { sendVerificationEmail } = require('../services/email.service')

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, dailyGoal } = req.body

    // Validação básica dos campos obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Nome, email e senha são obrigatórios'
      })
    }

    if (dailyGoal !== undefined && (typeof dailyGoal !== 'number' || dailyGoal < 1)) {
      return res.status(400).json({
        error: 'dailyGoal deve ser um número positivo'
      })
    }

    // Verifica se usuário já existe
    const userExists = await prisma.user.findUnique({
      where: {
        email: email
      }
    })

    if (userExists) {
      return res.status(400).json({
        error: 'Usuário já existe'
      })
    }

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10)
    // const verificationCode = generateVerificationCode()

    // Cria o usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        dailyGoal: dailyGoal || 10,
        // isVerified: false,
        // verificationCode
      }
    })

    // try {
    //   await sendVerificationEmail(email, verificationCode)
    // } catch (emailError) {
    //   await prisma.user.delete({ where: { id: user.id } })
    //   throw emailError
    // }

    const { password: _, verificationCode: __, ...userWithoutPassword } = user

    // res.status(201).json({
    //   ...userWithoutPassword,
    //   message: 'Conta criada. Verifique seu e-mail para o código de confirmação.'
    // })

    res.status(201).json(userWithoutPassword)

  } catch (error) {
    console.error('Erro no registro:', error)

    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Usuário já existe' })
    }

    const isEmailError =
      error.message?.includes('verificação') ||
      error.message?.includes('testing emails') ||
      error.message?.includes('verify a domain')

    res.status(isEmailError ? 502 : 500).json({
      error: isEmailError
        ? 'Não foi possível enviar o e-mail. Em modo de teste do Resend, cadastre-se com o mesmo e-mail da sua conta Resend, ou verifique um domínio em resend.com/domains.'
        : 'Erro interno'
    })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios'
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!user) {
      return res.status(400).json({
        error: 'Usuário não encontrado'
      })
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    )

    if (!passwordMatch) {
      return res.status(400).json({
        error: 'Senha inválida'
      })
    }

    const token = jwt.sign(
      {
        id: user.id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    )

    const { password: _, ...userWithoutPassword } = user

    res.json({
      user: userWithoutPassword,
      token
    })

  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      }
    })

    const { password, ...userWithoutPassword } = user

    res.json(userWithoutPassword)

  } catch (error) {
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      }
    })

    const totalWords = await prisma.word.count({
      where: {
        userId: req.userId
      }
    })

    const today = new Date()

    today.setHours(0, 0, 0, 0)

    const wordsToday = await prisma.word.count({
      where: {
        userId: req.userId,
        createdAt: {
          gte: today
        }
      }
    })

    const remainingToday =
      user.dailyGoal - wordsToday

    const yearProjection =
      user.dailyGoal * 365

    res.json({
      totalWords,
      dailyGoal: user.dailyGoal,
      wordsToday,
      remainingToday:
        remainingToday < 0 ? 0 : remainingToday,
      yearProjection
    })

  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

router.get('/me', auth, async (req, res) => {
  try {

    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        dailyGoal: true,
        createdAt: true
      }
    })

    res.json(user)

  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

router.put('/me/daily-goal', auth, async (req, res) => {
  try {
    const { dailyGoal } = req.body

    const goal = Number(dailyGoal)

    if (!goal || goal < 1) {
      return res.status(400).json({
        error: 'Meta diária deve ser maior que zero'
      })
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: req.userId
      },
      data: {
        dailyGoal: goal
      },
      select: {
        id: true,
        name: true,
        email: true,
        dailyGoal: true,
        createdAt: true
      }
    })

    res.json(updatedUser)
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

router.get('/streak', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      },
      select: {
        dailyGoal: true
      }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days = []

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)

      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + 1)

      const wordsCount = await prisma.word.count({
        where: {
          userId: req.userId,
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      })

      days.push({
        date: date.toISOString().split('T')[0],
        wordsCount,
        dailyGoal: user.dailyGoal,
        completed: wordsCount >= user.dailyGoal
      })
    }

    res.json(days)
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// function generateVerificationCode() {
//   return Math.floor(100000 + Math.random() * 900000).toString()
// }

module.exports = router