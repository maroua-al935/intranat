import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const childProcess = require('node:child_process')

const originalExec = childProcess.exec.bind(childProcess)
const originalExecFile = childProcess.execFile.bind(childProcess)

function isNetUseCommand(command, args = []) {
  if (typeof command !== 'string') {
    return false
  }

  const normalized = command.trim().toLowerCase()
  if (normalized === 'net use' || normalized.startsWith('net use ')) {
    return true
  }

  if ((normalized === 'net' || normalized === 'net.exe') && args[0]?.toString().toLowerCase() === 'use') {
    return true
  }

  return false
}

function fakeProcess(callback) {
  const child = new EventEmitter()
  child.pid = 0
  child.stdin = null
  child.stdout = null
  child.stderr = null
  child.kill = () => false
  child.ref = () => child
  child.unref = () => child
  child.send = () => false

  if (typeof callback === 'function') {
    process.nextTick(() => callback(null, '', ''))
  }

  return child
}

childProcess.exec = function patchedExec(command, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }

  if (isNetUseCommand(command)) {
    return fakeProcess(callback)
  }

  return originalExec(command, options, callback)
}

childProcess.execFile = function patchedExecFile(command, args, options, callback) {
  if (typeof args === 'function') {
    callback = args
    args = []
    options = undefined
  } else if (typeof options === 'function') {
    callback = options
    options = undefined
  }

  if (isNetUseCommand(command, args)) {
    return fakeProcess(callback)
  }

  return originalExecFile(command, args, options, callback)
}

await import('../node_modules/vite/bin/vite.js')
