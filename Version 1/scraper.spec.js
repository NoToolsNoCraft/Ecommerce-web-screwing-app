/// <reference types="cypress" />

describe('E-commerce Scraper', () => {
  it('Scrapes product information and saves to file', () => {
    const url = 'https://www.lidl.rs/'; // Replace with the URL of the e-commerce site
    const results = [];

    cy.visit(url);

    // Wait for the cookies window and click on the reject button
    cy.get('#onetrust-reject-all-handler', { timeout: 10000 }).should('be.visible').click();

    // Function to process each product
    function processProduct(index, selector) {
      cy.get(selector).eq(index).click();

      // Extract product information
      cy.get('h1.keyfacts__title') // Selector for the product title
        .invoke('text')
        .then((title) => {
          cy.get('.m-price__price') // Selector for the product price
            .invoke('text')
            .then((price) => {
              // Clean up and format the price
              price = price.replace(/\n/g, '').trim(); // Remove any new lines and trim whitespace
              if (!price.includes('din')) {
                price += ' din'; // Append "din" if it's missing
              }

              // Extract measure/amount information
              cy.get('.price-footer') // Selector for the measure/amount
                .invoke('text')
                .then((measure) => {
                  results.push({
                    title: title.trim(),
                    price: price.trim(),
                    measure: measure.trim(),
                  });

                  // Go back to the product list page
                  cy.go('back').then(() => {
                    // Wait for the page to navigate back before continuing
                    cy.wait(1000); // Adjust the wait time if necessary
                    processNextProduct(index + 1, selector);
                  });
                });
            });
        });
    }

    // Function to process the next product
    function processNextProduct(index, selector) {
      cy.get(selector).its('length').then((length) => {
        if (index < length) {
          // Check if the current element is the newsletter image
          cy.get(selector).eq(index).invoke('attr', 'alt').then((alt) => {
            if (alt === 'Lidl Newsletter') {
              // Stop processing further products and save results to file
              const uniqueResults = results.filter((product, i, self) =>
                i === self.findIndex((p) => (
                  p.title === product.title && p.price === product.price && p.measure === product.measure
                ))
              );
              const json = JSON.stringify(uniqueResults, null, 2);
              cy.writeFile('products.json', json, 'utf8'); // Using cy.writeFile instead of fs.writeFileSync
            } else {
              processProduct(index, selector);
            }
          });
        } else {
          // Save results to a file once all products have been processed
          const uniqueResults = results.filter((product, i, self) =>
            i === self.findIndex((p) => (
              p.title === product.title && p.price === product.price && p.measure === product.measure
            ))
          );
          const json = JSON.stringify(uniqueResults, null, 2);
          cy.writeFile('products.json', json, 'utf8'); // Using cy.writeFile instead of fs.writeFileSync
        }
      });
    }

    // Start processing the first product set (.ATeaserImage__Image)
    processNextProduct(0, '.ATeaserImage__Image');
    
    // Start processing the second product set (.grid-box__pdp-link)
    cy.get('.AProductGridBox__wrapper', { timeout: 10000 }).should('be.visible').then(() => {
      cy.get('.AProductGridBox__wrapper').eq(0).scrollIntoView().then(() => {
        processNextProduct(0, '.grid-box__pdp-link');
      });
    });
  });
});
