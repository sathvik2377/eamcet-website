const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Home page as direct access sometimes denies access
const TARGET_URL = "https://tgeapcet.nic.in/default.aspx";

/**
 * Converts an array of objects into a CSV string.
 * Assumes all objects have the same keys for the header.
 * @param {Array<Object>} data The array of objects to convert.
 * @returns {string} The CSV formatted string.
 */
function convertToCsv(data) {
  if (!data || data.length === 0) {
    return ""; // Return empty string if no data
  }

  // Extract headers from the first object's keys
  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add the header row
  csvRows.push(headers.map(header => `"${header}"`).join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];
      if (typeof value === 'string') {
        // Escape double quotes by doubling them, and enclose in quotes if it contains comma or newline
        value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('\n')) {
          value = `"${value}"`;
        }
      } else if (value === null || value === undefined) {
        value = ""; // Handle null/undefined values
      }
      return value;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

async function scrapeAllotments() {
  console.log("🚀 Starting the scraper...");
  // headless: true runs the browser in the background without a UI window
  const browser = await puppeteer.launch({ headless: true });
  const ua =
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.3"; // to mimic a mobile browser in headless mode
  const page = await browser.newPage();
  await page.setUserAgent(ua); // Set user agent to avoid detection
  await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 60000 }); // Increased timeout for initial page load
  console.log(`Navigated to ${TARGET_URL}`);

  // Selectors for the dropdowns, submit button, and results table
  const collegeSelector = "#MainContent_DropDownList1";
  const branchSelector = "#MainContent_DropDownList2";
  const submitButtonSelector = "#MainContent_btn_allot";
  const resultsTableSelector = "table.sortable";
  const collegeAllotmentLinkSelector = "a[href$='college_allotment.aspx']";

  // Prepare a promise to wait for a new page/tab to open when clicking the link
  const newPagePromise = new Promise((x) =>
    browser.once("targetcreated", (target) => x(target.page()))
  );

  console.log("Waiting for the college allotment link to appear...");
  // Wait for the link to be available before clicking it
  await page.waitForSelector(collegeAllotmentLinkSelector, { timeout: 30000 });

  console.log("Clicking the college allotment link...");
  // Click the link that leads to the college allotment page.
  await page.click(collegeAllotmentLinkSelector);

  console.log("Waiting for the new page to open and load...");
  const newPage = await newPagePromise;
  await newPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
  await newPage.setUserAgent(ua); // Set user agent for the new page as well
  console.log("New page loaded successfully.");

  console.log("Extracting college options...");
  await newPage.waitForSelector(collegeSelector, { timeout: 30000 }); // Ensure college dropdown is loaded
  const colleges = await newPage.evaluate((selector) => {
    return Array.from(document.querySelector(selector).options)
      .map((option) => ({ name: option.text, value: option.value }))
      .filter((opt) => opt.value !== ""); // Filter out the default "--Select--" option
  }, collegeSelector);
  console.log(`Found ${colleges.length} colleges.`);

  // Define the base output directory for all data
  const baseOutputFolder = path.resolve(__dirname, "2025 phase 2 data");
  if (!fs.existsSync(baseOutputFolder)) {
    fs.mkdirSync(baseOutputFolder, { recursive: true });
    console.log(`Created base data directory: ${baseOutputFolder}`);
  }

  // Loop through each college to scrape its data
  for (const college of colleges) {
    console.log(`\nProcessing college: ${college.name} (Code: ${college.value})`);

    // Create a directory for the college's data inside the base output folder
    const collegeFolderName = college.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
    const collegeDir = path.resolve(baseOutputFolder, collegeFolderName); // Path now includes baseOutputFolder
    if (!fs.existsSync(collegeDir)) {
      fs.mkdirSync(collegeDir, { recursive: true });
      console.log(`Created college directory: ${collegeDir}`);
    }

    // Select the current college in the dropdown
    console.log(`Selecting college dropdown value: ${college.value}...`);
    await newPage.select(collegeSelector, college.value);
    await newPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
    console.log("College selected and page reloaded.");

    // Get all branch names for the currently selected college
    console.log("Extracting branch options for this college...");
    await newPage.waitForSelector(branchSelector, { timeout: 30000 }); // Ensure branch dropdown is loaded
    const branches = await newPage.evaluate((selector) => {
      return Array.from(document.querySelector(selector).options)
        .map((option) => ({ name: option.text, value: option.value }))
        .filter((opt) => opt.value !== "0"); // Filter out the default "--Select--" option
    }, branchSelector);
    console.log(`Found ${branches.length} branches for ${college.name}.`);

    // Loop through each branch for the current college
    for (const branch of branches) {
      try {
        console.log(`  Fetching data for branch: ${branch.name}`);

        // Re-select college and then select the current branch.
        // This is crucial to ensure the correct context for the branch selection,
        // as the page might reset or change state during previous branch scrapes.
        await newPage.select(collegeSelector, college.value);
        await newPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

        await newPage.select(branchSelector, branch.value);
        // Note: For this site, selecting the branch often updates the form without a full navigation.
        // A direct click on submit is usually the next step.

        // Click the submit button and wait for the results table to appear
        console.log("  Clicking submit button for branch data...");
        await newPage.click(submitButtonSelector);
        await newPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
        console.log("  Results loaded for branch.");

        // Scrape the results table
        console.log("  Scraping results table...");
        await newPage.waitForSelector(resultsTableSelector, { timeout: 30000 }); // Ensure table is visible
        const tableData = await newPage.evaluate((tableSelector) => {
          const rows = document.querySelectorAll(`${tableSelector} tr`);
          const records = [];
          // Start from 1 to skip the header row (assuming the first row is always header)
          for (let i = 1; i < rows.length; i++) { // Changed to start from 1 to skip header
            const cells = rows[i].querySelectorAll("td");
            if (cells.length > 1) { // Ensure row has actual data
              records.push({
                sno: +cells[0]?.innerText.trim(),
                hallticketno: cells[1]?.innerText.trim(),
                rank: +cells[2]?.innerText.trim(),
                name: cells[3]?.innerText.trim(),
                sex: cells[4]?.innerText.trim(),
                caste: cells[5]?.innerText.trim(),
                region: cells[6]?.innerText.trim(),
                seatcategory: cells[7]?.innerText.trim(),
              });
            }
          }
          return records;
        }, resultsTableSelector);
        console.log(`  Scraped ${tableData.length} records for ${branch.name}.`);

        if (tableData.length > 0) {
          // Convert the scraped data to CSV format
          const csvData = convertToCsv(tableData);

          // Define the output file path for the current branch as a CSV file.
          // Replaces special characters and spaces for a clean file name
          const branchFileName = `${branch.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.csv`;
          const outputPath = path.resolve(collegeDir, branchFileName); // Path now includes collegeDir

          // Write the scraped data to the CSV file.
          fs.writeFileSync(outputPath, csvData);
          console.log(`  ✅ Data saved to ${outputPath}`);
        } else {
          console.log(`  No data found for ${branch.name}. Skipping file creation.`);
        }

        // Go back to the previous form state to continue with the next branch.
        console.log("  Going back to college/branch selection page...");
        await newPage.goBack();
        await newPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
        console.log("  Returned to selection page.");

      } catch (error) {
        console.error(
          `  ❌ Could not fetch data for ${college.name} -> ${branch.name}. Skipping. Error: ${error.message}`
        );
        // If an error occurs, attempt to go back to reset the page state and continue with the next branch.
        console.log("  Attempting to go back after error...");
        try {
          await newPage.goBack();
          await newPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
          console.log("  Returned to selection page after error.");
        } catch (goBackError) {
          console.error("  Failed to go back after error, potentially stuck:", goBackError.message);
          // If going back fails, it might be unrecoverable for this session, consider breaking or closing browser
          break; // Exit branch loop if cannot go back
        }
      }
    }
  }

  console.log(`\n🎉 Scraping complete for all colleges! Data organized in '2025 phase 2 data' folder.`);
  await browser.close();
  console.log("Browser closed.");
}

// Execute the scraping function and catch any top-level errors.
scrapeAllotments().catch(console.error);
