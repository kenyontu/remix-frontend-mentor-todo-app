# Frontend Mentor - Todo app solution

This is a solution to the [Todo app challenge on Frontend Mentor](https://www.frontendmentor.io/challenges/todo-app-Su1_KokOW). Frontend Mentor challenges help you improve your coding skills by building realistic projects.

## Table of contents

- [Overview](#overview)
  - [The challenge](#the-challenge)
  - [Screenshot](#screenshot)
  - [Links](#links)
- [My process](#my-process)
  - [Built with](#built-with)
  - [What I learned](#what-i-learned)
  - [Continued development](#continued-development)
- [Useful resources](#useful-resources)

## Overview

### The challenge

Users should be able to:

- View the optimal layout for the app depending on their device's screen size
- See hover states for all interactive elements on the page
- Add new todos to the list
- Mark todos as complete
- Delete todos from the list
- Filter by all/active/complete todos
- Clear all completed todos
- Toggle light and dark mode
- **Bonus**: Drag and drop to reorder items on the list
- **Bonus**: Build this project as a full-stack application

### Screenshots

#### Light theme

| Mobile layout                                                                                   | Desktop layout                                                                                    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| <a href="./screenshots/mobile-light.png"><img src="./screenshots/mobile-light-thumb.png" /></a> | <a href="./screenshots/desktop-light.png"><img src="./screenshots/desktop-light-thumb.png" /></a> |

#### Dark theme

| Mobile layout                                                                                 | Desktop layout                                                                                  |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| <a href="./screenshots/mobile-dark.png"><img src="./screenshots/mobile-dark-thumb.png" /></a> | <a href="./screenshots/desktop-dark.png"><img src="./screenshots/desktop-dark-thumb.png" /></a> |

### Links

- Solution URL: [Add solution URL here](https://your-solution-url.com)
- Live Site URL: [Add live site URL here](https://your-live-site-url.com)

## My process

### Built with

- Semantic HTML5 markup
- CSS custom properties
- Flexbox
- Mobile-first workflow
- [React](https://reactjs.org/) - JS library
- [Remix](https://remix.run/) - React framework
- [react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd) - Drag and drop library for React
- [Prisma](https://www.prisma.io/) - Database ORM
- [MongoDB](https://www.mongodb.com) - NoSQL document database

### What I learned

To build this app, I used two technologies I had no prior experience with, Remix and Prisma. Having completed it, I feel like I got a good understanding of their fundamentals.

In this section I will comment on some challenges I've encountered while building this app.

#### Visitor session

Since I wanted to complete the bonus challenge "Build this project as a full-stack application", the app needed to have some sort of authentication process. I solved this by implementing a mechanism where when a user opens the app for the first time, they are automatically signed in with a visitor session (which lasts for 24 hours) and can start using it right away.

#### Optimistic UI with Remix

My process to implement Optimistic UI was to delay every request by 3 seconds on the server and make the changes on the UI side.

Since you can have multiple todos being created, updated or deleted, todos being reordered, the user changing the filter or clearing completed todos. After some failed attempts I think I reached a good solution. Centralizing the changes by creating a copy of list of todos and them applying each ongoing request to it, made it a lot more predictable and easier to implement changes.

#### Reordering todos

This was one of the major issues I found, it becomes a more complex task when you need to save user-defined order in a database. After some research on discussions about how to tackle this issue, I decided on saving the todos as a reverse linked-list, where each todo has the ID to the previous todo. At the rendering stage the linked-list is reconstructed and the user-defined order is restored.

### Useful resources

- [Remix's Documentation page](https://remix.run/docs/en/v1) - Most of my learning on Remix was by reading the documentation.
- [Remix's GitHub repo](https://github.com/remix-run/remix) - The source code, multiple examples, discussions and issues were a great source of information.
- [Remix's Youtube channel](https://www.youtube.com/c/Remix-Run) - The "Remix Single" series by Ryan Florence is a must watch for anyone trying to learn Remix.
- [Prisma's Documentation](https://www.prisma.io/docs/) - From learning to build a scheme to making nested writes and transactions, the Prisma's documentation was a good source of learning material.
