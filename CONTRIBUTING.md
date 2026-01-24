# Contributing to Ollama Arena

Thank you for your interest in contributing to Ollama Arena! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ollama-arena.git`
3. Add upstream remote: `git remote add upstream https://github.com/ORIGINAL/ollama-arena.git`
4. Create a branch: `git checkout -b feature/amazing-feature`

## 💻 Development Setup

### Prerequisites

- Python 3.8+
- Ollama CLI installed
- Git for version control

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/ollama-arena.git
cd ollama-arena

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\Activate.ps1 on Windows

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Copy environment file
cp .env.example .env

# Run application
python run.py
```

### Running in Development Mode

```bash
export WEB_DEBUG=1
export LOG_LEVEL=DEBUG
python run.py
```

## 🎯 How to Contribute

### Types of Contributions

1. **Bug Fixes**: Fix identified bugs
2. **Features**: Add new functionality
3. **Documentation**: Improve docs
4. **Tests**: Add or improve tests
5. **Refactoring**: Improve code quality
6. **Performance**: Optimize performance

### Finding Issues

- Check [Issues](https://github.com/yourusername/ollama-arena/issues) page
- Look for `good first issue` or `help wanted` labels
- Ask in discussions if you're unsure where to start

## 📝 Coding Standards

### Python Code Style

Follow PEP 8 with these tools:

```bash
# Format code
black app/ *.py

# Sort imports
isort app/ *.py

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Python Guidelines

- **Type hints**: Add type hints to all functions
- **Docstrings**: Use Google-style docstrings
- **Line length**: Max 100 characters
- **Imports**: Group stdlib, third-party, local
- **Naming**: 
  - `snake_case` for functions/variables
  - `PascalCase` for classes
  - `UPPER_CASE` for constants

### Example Function

```python
def calculate_metrics(
    tokens: int,
    duration_ns: int
) -> Dict[str, float]:
    """
    Calculate performance metrics for model response.
    
    Args:
        tokens: Number of tokens generated
        duration_ns: Duration in nanoseconds
    
    Returns:
        Dict with tokens_per_sec and duration_s
    
    Raises:
        ValueError: If duration is zero
    """
    if duration_ns == 0:
        raise ValueError("Duration cannot be zero")
    
    duration_s = duration_ns / 1e9
    tokens_per_sec = tokens / duration_s
    
    return {
        'tokens_per_sec': round(tokens_per_sec, 2),
        'duration_s': round(duration_s, 2)
    }
```

### JavaScript Code Style

- **ES6+**: Use modern JavaScript
- **Const/Let**: No `var`
- **Arrow functions**: Prefer arrow functions
- **Comments**: Explain complex logic
- **Naming**: camelCase for functions/variables

### CSS Guidelines

- **Variables**: Use CSS custom properties
- **BEM**: Consider BEM naming for new components
- **Dark mode**: Always support dark mode
- **Responsive**: Mobile-first design

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_ollama_service.py

# Run with verbose output
pytest -v
```

### Writing Tests

```python
def test_list_models():
    """Test listing Ollama models."""
    service = OllamaService()
    models = service.list_models()
    
    assert isinstance(models, list)
    assert len(models) > 0
    assert all(isinstance(m, str) for m in models)
```

### Test Coverage

- Aim for 80%+ coverage
- Test happy paths and error cases
- Mock external dependencies (Ollama)
- Test edge cases

## 🔄 Pull Request Process

### Before Submitting

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**:
   ```bash
   pytest
   ```

3. **Format code**:
   ```bash
   black .
   isort .
   flake8 app/
   ```

4. **Update documentation**:
   - Update README if needed
   - Update API.md for API changes
   - Update CHANGELOG.md

5. **Commit messages**:
   ```
   feat: Add model comparison feature
   fix: Resolve timeout issue
   docs: Update installation guide
   test: Add tests for service layer
   refactor: Simplify error handling
   ```

### Submitting PR

1. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

2. **Create PR**:
   - Use descriptive title
   - Reference related issues
   - Describe changes made
   - Add screenshots for UI changes
   - List breaking changes

3. **PR Template**:
   ```markdown
   ## Description
   Brief description of changes
   
   ## Related Issues
   Fixes #123
   
   ## Changes Made
   - Added feature X
   - Fixed bug Y
   - Updated docs
   
   ## Testing
   - [ ] Added tests
   - [ ] All tests pass
   - [ ] Manual testing done
   
   ## Screenshots
   (if applicable)
   
   ## Breaking Changes
   (if any)
   ```

### Review Process

1. Maintainer reviews code
2. Address feedback
3. Update PR as needed
4. Once approved, maintainer merges

## 🐛 Issue Guidelines

### Bug Reports

Use this template:

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
Add screenshots if applicable

**Environment:**
 - OS: [e.g. Windows 11]
 - Python version: [e.g. 3.11]
 - Ollama version: [e.g. 0.1.20]

**Additional context**
Any other context
```

### Feature Requests

```markdown
**Is your feature related to a problem?**
Clear description of the problem

**Describe the solution**
Description of proposed solution

**Describe alternatives**
Alternative solutions considered

**Additional context**
Mockups, examples, etc.
```

## 🌳 Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-changed` - Code refactoring
- `test/what-tested` - Test additions

## 📚 Documentation

### When to Update Docs

- New features → Update README and API.md
- Config changes → Update .env.example
- API changes → Update API.md
- Breaking changes → Update CHANGELOG.md
- Setup changes → Update README

### Documentation Style

- Clear and concise
- Include examples
- Use code blocks
- Add screenshots for UI
- Keep up to date

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in CHANGELOG.md

## ❓ Questions?

- Open a [Discussion](https://github.com/yourusername/ollama-arena/discussions)
- Ask in existing issues
- Contact maintainers

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Ollama Arena!** 🎉
