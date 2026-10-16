/*
 * The MIT License
 *
 * Copyright (c) 2009-2026 PrimeFaces
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
package org.primefaces.integrationtests.datatable;

import org.primefaces.selenium.AbstractPrimePageTest;
import org.primefaces.selenium.PrimeSelenium;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("DataTable-selection")
class DataTable058Test extends AbstractPrimePageTest {

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @Order(1)
    @DisplayName("DataTable: bulk selection keeps ordered row keys and the submitted value synchronized")
    void bulkSelection(boolean nativeElements) {
        // Arrange
        goTo("datatable/dataTable058.xhtml?rows=3&native=" + nativeElements);

        // Act / Assert
        assertEquals("0,1,2", PrimeSelenium.executeScript(false,
                "PF('perfTable').selectAllRowsOnPage(); return $(PF('perfTable').selectionHolder).val();"));
        assertEquals("", PrimeSelenium.executeScript(false,
                "PF('perfTable').unselectAllRowsOnPage(); return $(PF('perfTable').selectionHolder).val();"));
        assertEquals("0,1,2", PrimeSelenium.executeScript(false,
                "PF('perfTable').checkAllToggler[0].click(); return $(PF('perfTable').selectionHolder).val();"));
        assertEquals("", PrimeSelenium.executeScript(false,
                "PF('perfTable').checkAllToggler[0].click(); return $(PF('perfTable').selectionHolder).val();"));
        assertEquals("@all", PrimeSelenium.executeScript(false,
                "PF('perfTable').selectAllRows(); return $(PF('perfTable').selectionHolder).val();"));
        assertNoJavascriptErrors();
    }
}
