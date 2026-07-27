function commandResult(success, code, data = {}) {
  return { success, code, data };
}

function success(code, data = {}) {
  return commandResult(true, code, data);
}

function failure(code, data = {}) {
  return commandResult(false, code, data);
}

module.exports = { commandResult, success, failure };
