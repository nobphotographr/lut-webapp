# Contributing to GLAZE LUT Web Application

Thank you for your interest in contributing to the GLAZE LUT Web Application! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions
We welcome various types of contributions:

- 🐛 **Bug Reports**: Help us identify and fix issues
- 💡 **Feature Requests**: Suggest new functionality
- 🔧 **Code Contributions**: Implement fixes and features
- 📚 **Documentation**: Improve guides and technical docs
- 🎨 **Design**: UI/UX improvements and GLAZE design system enhancements
- 🧪 **Testing**: Add test cases and improve quality assurance

## 📋 Before You Start

### Prerequisites
- Node.js 18.0+
- Git knowledge
- Basic understanding of React, TypeScript, and WebGL
- Familiarity with GLAZE design system

### Setting Up Development Environment
```bash
# Fork and clone the repository
git clone https://github.com/your-username/lut-webapp.git
cd lut-webapp

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🐛 Reporting Bugs

### Before Submitting a Bug Report
1. **Search existing issues** to avoid duplicates
2. **Test on latest version** to ensure bug still exists
3. **Gather system information**:
   - Browser version and type
   - Operating system
   - WebGL support status
   - Console error messages

### Bug Report Template
```markdown
## Bug Description
Clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Upload image '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots.

## Environment
- Browser: [e.g., Chrome 120.0]
- OS: [e.g., macOS 14.0]
- WebGL: [Check at chrome://gpu/]
- Image: [File format, size, dimensions]

## Console Logs
```
Include any console errors here
```

## Additional Context
Any other context about the problem.
```

## 💡 Suggesting Features

### Feature Request Guidelines
- **Check existing requests** to avoid duplicates
- **Explain the use case** and problem it solves
- **Consider GLAZE design consistency**
- **Think about implementation complexity**

### Feature Request Template
```markdown
## Feature Summary
Brief description of the feature.

## Problem Statement
What problem does this solve?

## Proposed Solution
Detailed description of how it should work.

## User Stories
- As a [user type], I want [functionality] so that [benefit]

## Design Considerations
- UI/UX mockups or descriptions
- GLAZE design system compliance
- Mobile responsiveness

## Technical Considerations
- Performance impact
- Browser compatibility
- WebGL requirements

## Alternatives Considered
Other approaches you've thought about.
```

## 🔧 Code Contributions

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Branch Naming Convention
```
type/short-description

Examples:
- feature/lut-export-functionality
- bugfix/webgl-memory-leak
- docs/api-documentation-update
- design/mobile-responsive-improvements
```

### Commit Message Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc.)
- refactor: Code refactoring
- test: Adding or modifying tests
- perf: Performance improvements
- build: Build system changes

Examples:
- feat(lut-processor): add HDR color space support
- fix(webgl): resolve texture memory leak
- docs(readme): update installation instructions
- style(components): apply GLAZE design system
```

### Code Style Guidelines

#### TypeScript
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Document complex algorithms with JSDoc

```typescript
// Good
interface LUTLayer {
  lutIndex: number;
  opacity: number;
  enabled: boolean;
}

/**
 * Applies 3D LUT transformation with trilinear interpolation
 * @param color - RGB color values (0-1)
 * @param lutData - 3D LUT data array
 * @param lutSize - LUT cube size (e.g., 17, 33, 65)
 * @returns Transformed RGB color values
 */
function applyLUTTransformation(
  color: [number, number, number],
  lutData: number[],
  lutSize: number
): [number, number, number] {
  // Implementation
}
```

#### React Components
- Use functional components with hooks
- Implement proper prop types with TypeScript
- Follow GLAZE design system patterns
- Ensure mobile responsiveness

```typescript
// Good
interface ImageUploaderProps {
  onImageUpload: (image: HTMLImageElement, file: File) => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
}

export default function ImageUploader({ 
  onImageUpload, 
  maxFileSize = 10 * 1024 * 1024,
  acceptedFormats = ['image/jpeg', 'image/png']
}: ImageUploaderProps) {
  // Component implementation
}
```

#### CSS/Tailwind
- Use GLAZE design tokens consistently
- Implement mobile-first responsive design
- Maintain 44px minimum touch targets
- Follow established spacing patterns

```tsx
// Good - GLAZE design system
<div className="bg-glaze-button border border-glaze-border rounded-md p-3 space-y-2">
  <button className="min-h-[44px] px-4 py-2 bg-glaze-accent text-glaze-text-primary rounded-md">
    Submit
  </button>
</div>
```

#### WebGL Code
- Always check for WebGL support
- Implement proper resource cleanup
- Handle shader compilation errors
- Optimize for mobile GPUs

```typescript
// Good
class WebGLProcessor {
  private gl: WebGL2RenderingContext;
  private resources: WebGLResource[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL 2.0 not supported');
    }
    this.gl = gl;
  }

  cleanup(): void {
    this.resources.forEach(resource => resource.destroy());
    this.resources = [];
  }
}
```

### Testing Requirements

#### Unit Tests
- Write tests for all utility functions
- Test edge cases and error conditions
- Maintain >80% code coverage

```typescript
// Good
describe('LUT coordinate calculation', () => {
  test('calculates correct coordinates for center color', () => {
    const color = [0.5, 0.5, 0.5];
    const lutSize = 17;
    
    const coords = calculateLUTCoordinates(color, lutSize);
    
    expect(coords.x).toBeCloseTo(8.0, 5);
    expect(coords.y).toBeCloseTo(8.0, 5);
    expect(coords.z).toBeCloseTo(8.0, 5);
  });

  test('handles edge case at color boundaries', () => {
    const color = [1.0, 1.0, 1.0];
    const lutSize = 17;
    
    const coords = calculateLUTCoordinates(color, lutSize);
    
    expect(coords.x).toBeLessThanOrEqual(lutSize - 1);
    expect(coords.y).toBeLessThanOrEqual(lutSize - 1);
    expect(coords.z).toBeLessThanOrEqual(lutSize - 1);
  });
});
```

#### Integration Tests
- Test complete workflows
- Verify WebGL functionality
- Check mobile compatibility

#### Visual Tests
- Screenshot comparison tests
- LUT accuracy validation
- Cross-browser rendering tests

### Performance Considerations
- **Image Processing**: Target <150ms for 1080p images
- **Memory Usage**: Keep peak usage under 200MB
- **WebGL**: Optimize shader compilation and texture uploads
- **Mobile**: Test on devices with limited GPU capabilities

### Accessibility Requirements
- Maintain WCAG 2.1 AA compliance
- Support keyboard navigation
- Provide screen reader compatibility
- Test with assistive technologies

## 🎨 GLAZE Design System Compliance

### Color Usage
Always use GLAZE design tokens:
```css
/* Good */
.button {
  background-color: var(--glaze-button);
  border: 1px solid var(--glaze-border);
  color: var(--glaze-text-primary);
}

/* Bad */
.button {
  background-color: #606060;
  border: 1px solid #525252;
  color: #ffffff;
}
```

### Typography
Follow GLAZE typography scale:
```css
/* Good */
.heading {
  font-family: var(--glaze-font-family);
  font-size: 1.125rem; /* 18px based on 15px base */
  line-height: 1.5;
}
```

### Component Patterns
Maintain consistency with existing components:
- 6px border radius (rounded-md)
- Consistent spacing using Tailwind scale
- Proper hover and focus states
- Mobile-responsive design

## 📚 Documentation Standards

### Code Documentation
- Use JSDoc for all public functions
- Include examples in complex algorithms
- Document WebGL shader code
- Explain performance considerations

### README Updates
- Keep installation instructions current
- Update feature lists with new functionality
- Maintain accurate system requirements
- Include relevant screenshots

### Technical Specifications
- Update architecture diagrams
- Document new APIs and interfaces
- Include performance benchmarks
- Maintain browser compatibility matrix

## 🧪 Quality Assurance

### Before Submitting
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] WebGL functionality tested
- [ ] Mobile responsiveness verified
- [ ] GLAZE design system compliance
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] No console errors or warnings

### PR Checklist Template
```markdown
## Changes Made
- [ ] Description of changes
- [ ] Screenshots for UI changes
- [ ] Performance impact assessment

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Mobile devices tested
- [ ] Cross-browser compatibility verified

## Design
- [ ] GLAZE design system compliant
- [ ] Responsive design implemented
- [ ] Accessibility requirements met
- [ ] Touch targets minimum 44px

## Documentation
- [ ] Code comments added
- [ ] README updated if needed
- [ ] Technical specs updated
- [ ] User guide updated if needed
```

## 🚀 Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Notes Format
```markdown
## [1.2.0] - 2024-01-15

### Added
- New HDR color space support
- Batch processing functionality
- Additional LUT export formats

### Changed
- Improved WebGL performance
- Updated GLAZE design system
- Enhanced mobile responsiveness

### Fixed
- Memory leak in texture management
- Color accuracy on Safari
- Touch gesture handling on iOS

### Security
- Updated dependencies
- Enhanced input validation
```

## 🔒 Security Guidelines

### Input Validation
- Validate all file uploads
- Sanitize user inputs
- Check image dimensions and file sizes
- Prevent XSS vulnerabilities

### WebGL Security
- Validate shader code
- Limit texture sizes
- Handle WebGL context loss
- Prevent GPU memory exhaustion

### Dependency Management
- Keep dependencies updated
- Audit for security vulnerabilities
- Use npm audit regularly
- Document security considerations

## 📞 Getting Help

### Communication Channels
- **Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Email**: For security concerns

### Code Review Process
1. Submit pull request with clear description
2. Automated tests must pass
3. Code review by maintainers
4. Address feedback and update PR
5. Merge after approval

### Mentorship
New contributors can:
- Start with "good first issue" labels
- Ask questions in discussions
- Request code review guidance
- Pair program with maintainers

## 🙏 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Invited to contributor discussions
- Credited in documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

**Thank you for helping make GLAZE better!**

*For questions about contributing, please open a discussion or contact the maintainers.*